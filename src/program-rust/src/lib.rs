use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

/// Define the type of state stored in accounts
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct RegistryAccount {
    pub uniqueid: u32,
    pub bridename: &str,
    pub groomname: &str,
    pub timestamp: &str,
}

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey, // Public key of the account the hello world program was loaded into
    accounts: &[AccountInfo], // The account to say hello to
    _instruction_data: &[u8], // Ignored, all helloworld instructions are hellos
) -> ProgramResult {
    msg!("Marriage Registry Rust program entrypoint");

    // Iterating accounts is safer then indexing
    let accounts_iter = &mut accounts.iter();

    // Get the account to register details to
    let account = next_account_info(accounts_iter)?;

    // The account must be owned by the program in order to modify its data
    if account.owner != program_id {
        msg!("Marriage Registry account does not have the correct program id");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Store details
    let mut greeting_account = RegistryAccount::try_from_slice(&account.data.borrow())?;
    greeting_account.uniqueid += 1;
    greeting_account.bridename = "Alena";
    greeting_account.groomname = "Alex";
    greeting_account.timestamp = "September 3, 2021";
    greeting_account.serialize(&mut &mut account.data.borrow_mut()[..])?;

    msg!("Details are registered successfully!");

    Ok(())
}