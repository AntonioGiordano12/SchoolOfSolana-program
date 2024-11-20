use anchor_lang::prelude::*;
use crate::states::*;

use crate::errors::GameError;


pub fn add_game_to_profile(ctx: Context<AddGameToProfile>) -> Result<()> {
    let profile = &mut ctx.accounts.user_profile;
    let game = ctx.accounts.game_config.key();

    // Ensure we don't exceed the maximum saved games limit
    require!(
        profile.saved_games.len() < UserProfile::MAX_SAVED_GAMES,
        GameError::TooManySavedGames
    );

    // Ensure the game isn't already saved
    require!(
        !profile.saved_games.contains(&game),
        GameError::GameAlreadySaved
    );

    profile.saved_games.push(game);
    Ok(())
}


#[derive(Accounts)]
pub struct AddGameToProfile<'info> {
    #[account(mut, seeds = [USER_SEED.as_bytes(), user.key().as_ref()], bump)]
    pub user_profile: Account<'info, UserProfile>,
    pub game_config: Account<'info, GameConfig>,
    pub user: Signer<'info>,
}

