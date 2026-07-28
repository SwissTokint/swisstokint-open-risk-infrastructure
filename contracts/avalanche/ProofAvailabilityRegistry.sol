// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

/// @title ProofAvailabilityRegistry
/// @notice Minimal, non-custodial registry for Proof of Method batch commitments.
/// @dev The contract stores hashes only. It has no owner, token, payment or trade path.
contract ProofAvailabilityRegistry {
    struct Commitment {
        bytes32 merkleRoot;
        bytes32 manifestHash;
        bytes32 evidenceHash;
        address issuer;
        uint64 registeredAt;
        bool revoked;
    }

    mapping(bytes32 batchId => Commitment) public commitments;

    error EmptyValue();
    error AlreadyRegistered(bytes32 batchId);
    error UnknownBatch(bytes32 batchId);
    error Unauthorized(address caller);
    error AlreadyRevoked(bytes32 batchId);

    event CommitmentRegistered(
        bytes32 indexed batchId,
        address indexed issuer,
        bytes32 merkleRoot,
        bytes32 manifestHash,
        bytes32 evidenceHash
    );
    event CommitmentRevoked(bytes32 indexed batchId, address indexed issuer);

    function register(
        bytes32 batchId,
        bytes32 merkleRoot,
        bytes32 manifestHash,
        bytes32 evidenceHash
    ) external {
        if (
            batchId == bytes32(0) ||
            merkleRoot == bytes32(0) ||
            manifestHash == bytes32(0) ||
            evidenceHash == bytes32(0)
        ) {
            revert EmptyValue();
        }
        if (commitments[batchId].issuer != address(0)) {
            revert AlreadyRegistered(batchId);
        }

        commitments[batchId] = Commitment({
            merkleRoot: merkleRoot,
            manifestHash: manifestHash,
            evidenceHash: evidenceHash,
            issuer: msg.sender,
            registeredAt: uint64(block.timestamp),
            revoked: false
        });

        emit CommitmentRegistered(
            batchId,
            msg.sender,
            merkleRoot,
            manifestHash,
            evidenceHash
        );
    }

    function revoke(bytes32 batchId) external {
        Commitment storage commitment = commitments[batchId];
        if (commitment.issuer == address(0)) {
            revert UnknownBatch(batchId);
        }
        if (commitment.issuer != msg.sender) {
            revert Unauthorized(msg.sender);
        }
        if (commitment.revoked) {
            revert AlreadyRevoked(batchId);
        }

        commitment.revoked = true;
        emit CommitmentRevoked(batchId, msg.sender);
    }

    function verify(
        bytes32 batchId,
        bytes32 merkleRoot,
        bytes32 manifestHash,
        bytes32 evidenceHash
    ) external view returns (bool) {
        Commitment storage commitment = commitments[batchId];
        return
            commitment.issuer != address(0) &&
            !commitment.revoked &&
            commitment.merkleRoot == merkleRoot &&
            commitment.manifestHash == manifestHash &&
            commitment.evidenceHash == evidenceHash;
    }
}
