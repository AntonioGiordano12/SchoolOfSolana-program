use anchor_lang::prelude::*;
use crate::states::*;

use crate::errors::GameError;

pub fn initialize_game(
    ctx: Context<InitializeGame>,
    alive_cells: Vec<u8>, 
) -> Result<()> {
    let initialized_game = &mut ctx.accounts.game_config;
    let user_owner = &mut ctx.accounts.game_owner;

    // Validate alive_cells size
    require!(
        alive_cells.len() <= GameConfig::MAX_ALIVE_CELLS,
        GameError::TooManyAliveCells
    );



    initialized_game.alive_cells.copy_from_slice(&alive_cells);

    initialized_game.game_owner = user_owner.key();
    initialized_game.iteration = 0;
    initialized_game.is_public = false;
    initialized_game.bump = ctx.bumps.game_config;

    
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(mut)]
    pub game_owner: Account<'info, UserProfile>,
    
    #[account(
        init,   
        payer = game_owner.user,
        space = 8 + GameConfig::LEN,
        seeds = [
            GAME_SEED.as_bytes(),
            game_owner.key().as_ref(),
            &game_owner.game_counter.to_le_bytes(),
            ],
            bump)]
    pub game_config: Account<'info, GameConfig>,
    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub user: Signer<'info>,
}

