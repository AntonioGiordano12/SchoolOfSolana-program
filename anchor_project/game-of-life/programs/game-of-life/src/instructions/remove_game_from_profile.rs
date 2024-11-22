use anchor_lang::prelude::*;
use crate::states::*;

// use crate::errors::GameError;

pub fn remove_game(_ctx: Context<RemoveGameFromProfile>) -> Result<()> {
    // let user_profile = &mut ctx.accounts.user_profile;
    // let game_save = &mut ctx.accounts.game_save;


    // Update user profile metadata
    // user_profile.game_counter = user_profile.game_counter.checked_sub(1).ok_or(GameError::MinGamesReached)?;

    Ok(())
}


#[derive(Accounts)]
pub struct RemoveGameFromProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>, // user removing the game
    #[account(
        mut,
        close=user,
        seeds = [
            GAME_SAVE_SEED.as_bytes(),
            user.key().as_ref(),
            game_config.key().as_ref(),
        ],
        bump = game_save.bump,
    )]
    pub game_save: Account<'info, GameSave>, // Game save entry to remove
    #[account(
        mut,
        seeds = [
            USER_SEED.as_bytes(),
            user.key().as_ref(),
        ],
        bump = user_profile.bump,
    )]
    pub user_profile: Account<'info, UserProfile>, // The user's profile
    #[account(
        seeds = [
            GAME_SEED.as_bytes(),
            game_config_owner.key().as_ref(),
            game_config.key().as_ref(),
        ],
        bump = game_config.bump,
    )]
    pub game_config: Account<'info, GameConfig>, // The game being removed
    pub game_config_owner: Signer<'info>,        // Owner of the game
    pub system_program: Program<'info, System>,  // System program
}

