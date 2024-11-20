use anchor_lang::prelude::*;
use crate::states::*;
use crate::{errors::GameError};

pub fn remove_game_from_profile(ctx: Context<RemoveGameFromProfile>) -> Result<()> {
    let profile = &mut ctx.accounts.user_profile;
    let game = ctx.accounts.game_config.key();

    // Ensure the game exists in the saved list
    require!(
        profile.saved_games.contains(&game),
        GameError::GameNotSaved
    );

    // Remove the game from the saved list
    profile.saved_games.retain(|&g| g != game);
    Ok(())
}


#[derive(Accounts)]
pub struct RemoveGameFromProfile<'info> {
    #[account(mut, seeds = [USER_SEED.as_bytes(), user.key().as_ref()], bump)]
    pub user_profile: Account<'info, UserProfile>,
    pub game_config: Account<'info, GameConfig>,
    pub user: Signer<'info>,
}

