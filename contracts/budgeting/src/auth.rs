use near_sdk::env;

use crate::Contract;

impl Contract {
    pub(crate) fn assert_sputnik_dao(&self) {
        if env::predecessor_account_id() != self.sputnik_dao_account {
            env::panic_str("ERR_NOT_SPUTNIK_DAO");
        }
    }
}
