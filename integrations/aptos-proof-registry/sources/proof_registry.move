module proof_registry::proof_registry {
    use aptos_std::table::{Self, Table};
    use aptos_framework::event;

    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_INITIALIZED: u64 = 2;
    const E_BAD_HASH_LENGTH: u64 = 3;
    const E_ALREADY_REGISTERED: u64 = 4;
    const E_UNKNOWN_BATCH: u64 = 5;
    const E_ALREADY_REVOKED: u64 = 6;

    struct Commitment has copy, drop, store {
        merkle_root: vector<u8>,
        manifest_hash: vector<u8>,
        evidence_hash: vector<u8>,
        issuer: address,
        revoked: bool,
    }

    struct Registry has key {
        commitments: Table<vector<u8>, Commitment>,
    }

    #[event]
    struct CommitmentRegistered has drop, store {
        owner: address,
        batch_id: vector<u8>,
        merkle_root: vector<u8>,
        manifest_hash: vector<u8>,
        evidence_hash: vector<u8>,
    }

    #[event]
    struct CommitmentRevoked has drop, store {
        owner: address,
        batch_id: vector<u8>,
    }

    public entry fun initialize(owner: &signer) {
        let owner_address = owner.address_of();
        assert!(!exists<Registry>(owner_address), E_ALREADY_INITIALIZED);
        move_to(owner, Registry {
            commitments: table::new<vector<u8>, Commitment>(),
        });
    }

    public entry fun register(
        owner: &signer,
        batch_id: vector<u8>,
        merkle_root: vector<u8>,
        manifest_hash: vector<u8>,
        evidence_hash: vector<u8>,
    ) acquires Registry {
        assert_hash(&batch_id);
        assert_hash(&merkle_root);
        assert_hash(&manifest_hash);
        assert_hash(&evidence_hash);

        let owner_address = owner.address_of();
        assert!(exists<Registry>(owner_address), E_NOT_INITIALIZED);
        let registry = &mut Registry[owner_address];
        assert!(
            !registry.commitments.contains(copy batch_id),
            E_ALREADY_REGISTERED,
        );

        registry.commitments.add(
            copy batch_id,
            Commitment {
                merkle_root: copy merkle_root,
                manifest_hash: copy manifest_hash,
                evidence_hash: copy evidence_hash,
                issuer: owner_address,
                revoked: false,
            },
        );
        event::emit(CommitmentRegistered {
            owner: owner_address,
            batch_id,
            merkle_root,
            manifest_hash,
            evidence_hash,
        });
    }

    public entry fun revoke(owner: &signer, batch_id: vector<u8>) acquires Registry {
        assert_hash(&batch_id);
        let owner_address = owner.address_of();
        assert!(exists<Registry>(owner_address), E_NOT_INITIALIZED);
        let registry = &mut Registry[owner_address];
        assert!(
            registry.commitments.contains(copy batch_id),
            E_UNKNOWN_BATCH,
        );
        let commitment = registry.commitments.borrow_mut(copy batch_id);
        assert!(!commitment.revoked, E_ALREADY_REVOKED);
        commitment.revoked = true;
        event::emit(CommitmentRevoked {
            owner: owner_address,
            batch_id,
        });
    }

    #[view]
    public fun verify(
        owner: address,
        batch_id: vector<u8>,
        merkle_root: vector<u8>,
        manifest_hash: vector<u8>,
        evidence_hash: vector<u8>,
    ): bool acquires Registry {
        if (!exists<Registry>(owner)) return false;
        let registry = &Registry[owner];
        if (!registry.commitments.contains(copy batch_id)) return false;
        let commitment = registry.commitments.borrow(batch_id);
        !commitment.revoked
            && commitment.issuer == owner
            && commitment.merkle_root == merkle_root
            && commitment.manifest_hash == manifest_hash
            && commitment.evidence_hash == evidence_hash
    }

    #[view]
    public fun is_registered(owner: address, batch_id: vector<u8>): bool acquires Registry {
        exists<Registry>(owner)
            && (&Registry[owner].commitments).contains(batch_id)
    }

    fun assert_hash(value: &vector<u8>) {
        assert!(value.length() == 32, E_BAD_HASH_LENGTH);
    }

    #[test(owner = @proof_registry)]
    fun register_verify_and_revoke(owner: signer) acquires Registry {
        let batch_id = b"00000000000000000000000000000001";
        let merkle_root = b"11111111111111111111111111111111";
        let manifest_hash = b"22222222222222222222222222222222";
        let evidence_hash = b"33333333333333333333333333333333";
        let owner_address = owner.address_of();

        initialize(&owner);
        register(
            &owner,
            copy batch_id,
            copy merkle_root,
            copy manifest_hash,
            copy evidence_hash,
        );
        assert!(is_registered(owner_address, copy batch_id), 100);
        assert!(
            verify(
                owner_address,
                copy batch_id,
                copy merkle_root,
                copy manifest_hash,
                copy evidence_hash,
            ),
            101,
        );
        revoke(&owner, copy batch_id);
        assert!(
            !verify(owner_address, batch_id, merkle_root, manifest_hash, evidence_hash),
            102,
        );
    }

    #[test(owner = @proof_registry)]
    #[expected_failure(abort_code = E_ALREADY_REGISTERED)]
    fun duplicate_registration_fails(owner: signer) acquires Registry {
        let batch_id = b"00000000000000000000000000000001";
        let merkle_root = b"11111111111111111111111111111111";
        let manifest_hash = b"22222222222222222222222222222222";
        let evidence_hash = b"33333333333333333333333333333333";

        initialize(&owner);
        register(
            &owner,
            copy batch_id,
            copy merkle_root,
            copy manifest_hash,
            copy evidence_hash,
        );
        register(&owner, batch_id, merkle_root, manifest_hash, evidence_hash);
    }

    #[test(owner = @proof_registry)]
    #[expected_failure(abort_code = E_BAD_HASH_LENGTH)]
    fun malformed_hash_fails(owner: signer) acquires Registry {
        initialize(&owner);
        register(
            &owner,
            b"short",
            b"11111111111111111111111111111111",
            b"22222222222222222222222222222222",
            b"33333333333333333333333333333333",
        );
    }

    #[test(owner = @proof_registry)]
    #[expected_failure(abort_code = E_ALREADY_REVOKED)]
    fun repeated_revocation_fails(owner: signer) acquires Registry {
        let batch_id = b"00000000000000000000000000000001";
        initialize(&owner);
        register(
            &owner,
            copy batch_id,
            b"11111111111111111111111111111111",
            b"22222222222222222222222222222222",
            b"33333333333333333333333333333333",
        );
        revoke(&owner, copy batch_id);
        revoke(&owner, batch_id);
    }

    #[test(owner = @proof_registry, attacker = @0xbad)]
    #[expected_failure(abort_code = E_UNKNOWN_BATCH)]
    fun cross_account_revocation_fails(owner: signer, attacker: signer) acquires Registry {
        let batch_id = b"00000000000000000000000000000001";
        initialize(&owner);
        initialize(&attacker);
        register(
            &owner,
            copy batch_id,
            b"11111111111111111111111111111111",
            b"22222222222222222222222222222222",
            b"33333333333333333333333333333333",
        );
        revoke(&attacker, batch_id);
    }
}
