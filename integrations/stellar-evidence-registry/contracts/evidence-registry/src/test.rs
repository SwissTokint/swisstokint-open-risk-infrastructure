#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, BytesN, Env};

#[test]
fn registers_verifies_and_revokes_a_record() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(1_234_567);

    let contract_id = env.register(EvidenceRegistry, ());
    let client = EvidenceRegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let writer = Address::generate(&env);

    client.initialize(&admin);
    client.set_writer(&writer, &true);

    let batch_id = BytesN::from_array(&env, &[1; 32]);
    let merkle_root = BytesN::from_array(&env, &[2; 32]);
    let manifest_hash = BytesN::from_array(&env, &[3; 32]);
    let evidence_hash = BytesN::from_array(&env, &[4; 32]);
    let reason_hash = BytesN::from_array(&env, &[5; 32]);

    let record = client.register(
        &writer,
        &batch_id,
        &merkle_root,
        &manifest_hash,
        &evidence_hash,
    );
    assert_eq!(record.issuer, writer);
    assert_eq!(record.status, RecordStatus::Active);
    assert_eq!(record.registered_at_ledger, 1_234_567);
    assert!(client.verify(&batch_id, &merkle_root, &manifest_hash, &evidence_hash));

    let revoked = client.revoke(&admin, &batch_id, &reason_hash);
    assert_eq!(revoked.status, RecordStatus::Revoked);
    assert_eq!(revoked.revocation_reason_hash, Some(reason_hash));
    assert!(!client.verify(&batch_id, &merkle_root, &manifest_hash, &evidence_hash));
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn rejects_duplicate_batch_ids() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EvidenceRegistry, ());
    let client = EvidenceRegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let batch_id = BytesN::from_array(&env, &[1; 32]);
    let merkle_root = BytesN::from_array(&env, &[2; 32]);
    let manifest_hash = BytesN::from_array(&env, &[3; 32]);
    let evidence_hash = BytesN::from_array(&env, &[4; 32]);

    client.initialize(&admin);
    client.register(
        &admin,
        &batch_id,
        &merkle_root,
        &manifest_hash,
        &evidence_hash,
    );
    client.register(
        &admin,
        &batch_id,
        &merkle_root,
        &manifest_hash,
        &evidence_hash,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn rejects_unauthorized_writers() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EvidenceRegistry, ());
    let client = EvidenceRegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let outsider = Address::generate(&env);

    client.initialize(&admin);
    client.register(
        &outsider,
        &BytesN::from_array(&env, &[1; 32]),
        &BytesN::from_array(&env, &[2; 32]),
        &BytesN::from_array(&env, &[3; 32]),
        &BytesN::from_array(&env, &[4; 32]),
    );
}
