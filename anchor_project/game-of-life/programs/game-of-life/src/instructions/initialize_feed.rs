use crate::states::*;
use anchor_lang::prelude::*;

use crate::errors::GameError;

#[derive(Accounts)]
pub struct InitializeFeed<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Feed::LEN,
        seeds = [FEED_SEED.as_bytes()],
        bump
    )]
    pub feed: Account<'info, Feed>, // Feed account
    /// CHECK: This PDA will act as the feed authority and is verified by seeds.
    #[account(
        seeds = [b"feed_authority"],
        bump
    )]
    pub feed_authority: UncheckedAccount<'info>, // program-signed PDA

    #[account(mut)]
    pub payer: Signer<'info>, // Payer of the transaction
    pub system_program: Program<'info, System>, // System program
}

pub fn initialize_feed(ctx: Context<InitializeFeed>) -> Result<()> {
    let feed = &mut ctx.accounts.feed;

    // Verify the authority is the program's PDA
    let feed_authority = ctx.accounts.feed_authority.key();
    let expected_authority = Pubkey::create_program_address(
        &[b"feed_authority", &[ctx.bumps.feed_authority]],
        ctx.program_id,
    )
    .map_err(|_| ProgramError::InvalidSeeds)?;

    require_keys_eq!(feed_authority, expected_authority, GameError::InvalidAuthority);

    // Initialize the feed with an empty list of games
    feed.games = Vec::new();
    feed.bump = ctx.bumps.feed;

    Ok(())
}
