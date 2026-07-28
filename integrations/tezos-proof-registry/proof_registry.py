import smartpy as sp


@sp.module
def main():
    commitment_type: type = sp.record(
        merkle_root=sp.bytes,
        manifest_hash=sp.bytes,
        evidence_hash=sp.bytes,
        issuer=sp.address,
        registered_at=sp.timestamp,
        revoked=sp.bool,
    )

    verify_type: type = sp.record(
        batch_id=sp.bytes,
        merkle_root=sp.bytes,
        manifest_hash=sp.bytes,
        evidence_hash=sp.bytes,
    )

    class ProofCommitmentRegistry(sp.Contract):
        def __init__(self):
            self.data.commitments = sp.big_map()
            sp.cast(
                self.data.commitments,
                sp.big_map[sp.bytes, commitment_type],
            )

        @sp.entrypoint
        def register(
            self,
            batch_id,
            merkle_root,
            manifest_hash,
            evidence_hash,
        ):
            sp.cast(batch_id, sp.bytes)
            sp.cast(merkle_root, sp.bytes)
            sp.cast(manifest_hash, sp.bytes)
            sp.cast(evidence_hash, sp.bytes)
            assert sp.len(batch_id) == 32, "BAD_BATCH_ID"
            assert sp.len(merkle_root) == 32, "BAD_MERKLE_ROOT"
            assert sp.len(manifest_hash) == 32, "BAD_MANIFEST_HASH"
            assert sp.len(evidence_hash) == 32, "BAD_EVIDENCE_HASH"
            assert not self.data.commitments.contains(batch_id), "ALREADY_REGISTERED"

            self.data.commitments[batch_id] = sp.record(
                merkle_root=merkle_root,
                manifest_hash=manifest_hash,
                evidence_hash=evidence_hash,
                issuer=sp.sender,
                registered_at=sp.now,
                revoked=False,
            )

        @sp.entrypoint
        def revoke(self, batch_id):
            sp.cast(batch_id, sp.bytes)
            assert self.data.commitments.contains(batch_id), "UNKNOWN_BATCH"
            commitment = self.data.commitments[batch_id]
            assert commitment.issuer == sp.sender, "UNAUTHORIZED"
            assert not commitment.revoked, "ALREADY_REVOKED"
            commitment.revoked = True
            self.data.commitments[batch_id] = commitment

        @sp.onchain_view
        def verify(self, params):
            sp.cast(params, verify_type)
            exists = self.data.commitments.contains(params.batch_id)
            valid = False
            if exists:
                commitment = self.data.commitments[params.batch_id]
                valid = (
                    not commitment.revoked
                    and commitment.merkle_root == params.merkle_root
                    and commitment.manifest_hash == params.manifest_hash
                    and commitment.evidence_hash == params.evidence_hash
                )
            return valid


@sp.add_test()
def test():
    scenario = sp.test_scenario("SwissTokint Tezos Proof Registry", main)
    alice = sp.test_account("Alice")
    bob = sp.test_account("Bob")
    contract = main.ProofCommitmentRegistry()
    scenario += contract

    batch_id = sp.bytes("0x" + ("11" * 32))
    merkle_root = sp.bytes("0x" + ("22" * 32))
    manifest_hash = sp.bytes("0x" + ("33" * 32))
    evidence_hash = sp.bytes("0x" + ("44" * 32))

    contract.register(
        batch_id=batch_id,
        merkle_root=merkle_root,
        manifest_hash=manifest_hash,
        evidence_hash=evidence_hash,
        _sender=alice,
        _now=sp.timestamp(1_753_689_600),
    )
    scenario.verify(contract.data.commitments[batch_id].issuer == alice.address)
    scenario.verify(
        contract.verify(
            sp.record(
                batch_id=batch_id,
                merkle_root=merkle_root,
                manifest_hash=manifest_hash,
                evidence_hash=evidence_hash,
            )
        )
    )

    contract.register(
        batch_id=batch_id,
        merkle_root=merkle_root,
        manifest_hash=manifest_hash,
        evidence_hash=evidence_hash,
        _sender=bob,
        _valid=False,
        _exception="ALREADY_REGISTERED",
    )
    contract.revoke(
        batch_id,
        _sender=bob,
        _valid=False,
        _exception="UNAUTHORIZED",
    )
    contract.revoke(batch_id, _sender=alice)
    scenario.verify(contract.data.commitments[batch_id].revoked)
    scenario.verify(
        not contract.verify(
            sp.record(
                batch_id=batch_id,
                merkle_root=merkle_root,
                manifest_hash=manifest_hash,
                evidence_hash=evidence_hash,
            )
        )
    )
