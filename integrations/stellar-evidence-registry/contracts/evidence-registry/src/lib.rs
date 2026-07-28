#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, BytesN, Env,
};

#[contract]
pub struct EvidenceRegistry;

const INSTANCE_TTL_THRESHOLD: u32 = 30 * 17_280;
const INSTANCE_TTL_EXTEND_TO: u32 = 365 * 17_280;
const RECORD_TTL_THRESHOLD: u32 = 90 * 17_280;
const RECORD_TTL_EXTEND_TO: u32 = 5 * 365 * 17_280;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Writer(Address),
    Record(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RecordStatus {
    Active,
    Revoked,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AnchorRecord {
    pub batch_id: BytesN<32>,
    pub merkle_root: BytesN<32>,
    pub manifest_hash: BytesN<32>,
    pub evidence_hash: BytesN<32>,
    pub issuer: Address,
    pub registered_at_ledger: u32,
    pub status: RecordStatus,
    pub revocation_reason_hash: Option<BytesN<32>>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RegistryInitialized {
    #[topic]
    pub admin: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WriterUpdated {
    #[topic]
    pub writer: Address,
    pub authorized: bool,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AnchorRegistered {
    #[topic]
    pub batch_id: BytesN<32>,
    #[topic]
    pub issuer: Address,
    pub merkle_root: BytesN<32>,
    pub manifest_hash: BytesN<32>,
    pub evidence_hash: BytesN<32>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AnchorRevoked {
    #[topic]
    pub batch_id: BytesN<32>,
    #[topic]
    pub caller: Address,
    pub reason_hash: BytesN<32>,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RegistryError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    RecordAlreadyExists = 4,
    RecordNotFound = 5,
    RecordRevoked = 6,
}

fn bump_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);
}

fn admin(env: &Env) -> Result<Address, RegistryError> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(RegistryError::NotInitialized)
}

fn require_writer(env: &Env, writer: &Address) -> Result<(), RegistryError> {
    let authorized = env
        .storage()
        .persistent()
        .get::<DataKey, bool>(&DataKey::Writer(writer.clone()))
        .unwrap_or(false);
    if !authorized {
        return Err(RegistryError::Unauthorized);
    }
    Ok(())
}

#[contractimpl]
impl EvidenceRegistry {
    pub fn initialize(env: Env, admin_address: Address) -> Result<(), RegistryError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(RegistryError::AlreadyInitialized);
        }

        admin_address.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Admin, &admin_address);
        let writer_key = DataKey::Writer(admin_address.clone());
        env.storage().persistent().set(&writer_key, &true);
        env.storage().persistent().extend_ttl(
            &writer_key,
            RECORD_TTL_THRESHOLD,
            RECORD_TTL_EXTEND_TO,
        );
        bump_instance_ttl(&env);
        RegistryInitialized {
            admin: admin_address,
        }
        .publish(&env);
        Ok(())
    }

    pub fn set_writer(env: Env, writer: Address, authorized: bool) -> Result<(), RegistryError> {
        let admin_address = admin(&env)?;
        admin_address.require_auth();

        let writer_key = DataKey::Writer(writer.clone());
        env.storage().persistent().set(&writer_key, &authorized);
        env.storage().persistent().extend_ttl(
            &writer_key,
            RECORD_TTL_THRESHOLD,
            RECORD_TTL_EXTEND_TO,
        );
        bump_instance_ttl(&env);
        WriterUpdated { writer, authorized }.publish(&env);
        Ok(())
    }

    pub fn register(
        env: Env,
        writer: Address,
        batch_id: BytesN<32>,
        merkle_root: BytesN<32>,
        manifest_hash: BytesN<32>,
        evidence_hash: BytesN<32>,
    ) -> Result<AnchorRecord, RegistryError> {
        admin(&env)?;
        writer.require_auth();
        require_writer(&env, &writer)?;

        let record_key = DataKey::Record(batch_id.clone());
        if env.storage().persistent().has(&record_key) {
            return Err(RegistryError::RecordAlreadyExists);
        }

        let record = AnchorRecord {
            batch_id: batch_id.clone(),
            merkle_root,
            manifest_hash,
            evidence_hash,
            issuer: writer,
            registered_at_ledger: env.ledger().sequence(),
            status: RecordStatus::Active,
            revocation_reason_hash: None,
        };
        env.storage().persistent().set(&record_key, &record);
        env.storage().persistent().extend_ttl(
            &record_key,
            RECORD_TTL_THRESHOLD,
            RECORD_TTL_EXTEND_TO,
        );
        bump_instance_ttl(&env);
        AnchorRegistered {
            batch_id,
            issuer: record.issuer.clone(),
            merkle_root: record.merkle_root.clone(),
            manifest_hash: record.manifest_hash.clone(),
            evidence_hash: record.evidence_hash.clone(),
        }
        .publish(&env);
        Ok(record)
    }

    pub fn revoke(
        env: Env,
        caller: Address,
        batch_id: BytesN<32>,
        reason_hash: BytesN<32>,
    ) -> Result<AnchorRecord, RegistryError> {
        let admin_address = admin(&env)?;
        caller.require_auth();

        let record_key = DataKey::Record(batch_id.clone());
        let mut record: AnchorRecord = env
            .storage()
            .persistent()
            .get(&record_key)
            .ok_or(RegistryError::RecordNotFound)?;
        if record.status == RecordStatus::Revoked {
            return Err(RegistryError::RecordRevoked);
        }
        if caller != admin_address && caller != record.issuer {
            return Err(RegistryError::Unauthorized);
        }

        record.status = RecordStatus::Revoked;
        record.revocation_reason_hash = Some(reason_hash.clone());
        env.storage().persistent().set(&record_key, &record);
        env.storage().persistent().extend_ttl(
            &record_key,
            RECORD_TTL_THRESHOLD,
            RECORD_TTL_EXTEND_TO,
        );
        bump_instance_ttl(&env);
        AnchorRevoked {
            batch_id,
            caller,
            reason_hash,
        }
        .publish(&env);
        Ok(record)
    }

    pub fn get(env: Env, batch_id: BytesN<32>) -> Result<AnchorRecord, RegistryError> {
        bump_instance_ttl(&env);
        let record_key = DataKey::Record(batch_id);
        let record = env
            .storage()
            .persistent()
            .get(&record_key)
            .ok_or(RegistryError::RecordNotFound)?;
        env.storage().persistent().extend_ttl(
            &record_key,
            RECORD_TTL_THRESHOLD,
            RECORD_TTL_EXTEND_TO,
        );
        Ok(record)
    }

    pub fn verify(
        env: Env,
        batch_id: BytesN<32>,
        merkle_root: BytesN<32>,
        manifest_hash: BytesN<32>,
        evidence_hash: BytesN<32>,
    ) -> bool {
        let record_key = DataKey::Record(batch_id);
        let Some(record) = env
            .storage()
            .persistent()
            .get::<DataKey, AnchorRecord>(&record_key)
        else {
            return false;
        };
        record.status == RecordStatus::Active
            && record.merkle_root == merkle_root
            && record.manifest_hash == manifest_hash
            && record.evidence_hash == evidence_hash
    }
}

mod test;
