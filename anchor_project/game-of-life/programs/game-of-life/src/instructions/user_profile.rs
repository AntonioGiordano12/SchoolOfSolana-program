use anchor_lang::prelude::*;
use crate::states::*;
// use crate::errors::GameError;

pub fn initialize_user(ctx: Context<InitializeUserProfile>) -> Result<()> {
    let profile = &mut ctx.accounts.user_profile;
    profile.user = ctx.accounts.user.key();
    profile.game_counter = 0;
    // profile.minted_nfts = Vec::new();
    profile.bump = ctx.bumps.user_profile;
    Ok(())
}


#[derive(Accounts)]
pub struct InitializeUserProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init,
        payer = user,
        space = 8 + UserProfile::LEN,
        seeds = [
            USER_SEED.as_bytes(), 
            user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    pub system_program: Program<'info, System>,
}
