use anchor_lang::prelude::*;
use crate::instructions::*;

pub mod instructions;
pub mod states;
pub mod errors;


declare_id!("nxbjws2J8UQkXRsDJEEttbXfHucLT4duAtZVcZXVmHH");

#[program]
pub mod game_of_life {
    use super::*;

    pub fn initialize(ctx: Context<InitializeGame>, alive_cells: Vec<(u8, u8)>) -> Result<()> {
        instructions::initialize_game(ctx, alive_cells)
    }

    pub fn initialize_user_profile(ctx: Context<InitializeUserProfile>) -> Result<()> {
        instructions::initialize_user_profile(ctx)
    }
    
    pub fn add_game_to_profile(ctx: Context<AddGameToProfile>) -> Result<()> {
        instructions::add_game_to_profile(ctx)
    }
    
    pub fn remove_game_from_profile(ctx: Context<RemoveGameFromProfile>) -> Result<()> {
        instructions::remove_game_from_profile(ctx)
    }
    
    
}
