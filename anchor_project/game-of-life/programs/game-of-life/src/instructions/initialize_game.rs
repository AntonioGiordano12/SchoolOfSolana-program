use anchor_lang::prelude::*;
use crate::states::*;

use crate::errors::GameError;

pub fn initialize_game(
    ctx: Context<InitializeGame>,
    alive_cells: Vec<u8>, 
) -> Result<()> {
    let game_config = &mut ctx.accounts.game_config;
    let user_profile = &mut ctx.accounts.user_profile;

    // Validate alive_cells size
    require!(
        alive_cells.len() <= GameConfig::MAX_ALIVE_CELLS,
        GameError::TooManyAliveCells
    );

    // Increment the game counter
    // let game_id = user_profile.game_counter;
    user_profile.game_counter += 1;


    game_config.game_owner = user_profile.key();
    game_config.alive_cells.copy_from_slice(&alive_cells);
    game_config.iteration = 0;
    game_config.is_public = true;
    game_config.bump = ctx.bumps.game_config;

    
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(
        mut,
        seeds = [
            USER_SEED.as_bytes(),
            game_owner.key().as_ref(),
        ],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>, // Reference to the user profile

    #[account(
        init,
        payer = game_owner,
        space = 8 + GameConfig::LEN,
        seeds = [
            GAME_SEED.as_bytes(),
            game_owner.key().as_ref(),
            &user_profile.game_counter.to_le_bytes(), // Use the counter as part of the seed
        ],
        bump
    )]
    pub game_config: Account<'info, GameConfig>, // New game config
    #[account(mut)]
    pub game_owner: Signer<'info>,              // The game owner
    pub system_program: Program<'info, System>, // System program
}

