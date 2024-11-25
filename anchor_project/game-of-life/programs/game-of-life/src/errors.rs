use anchor_lang::prelude::*;

#[error_code]
pub enum GameError {
    #[msg("Cannot initialize,ID too long")]
    IDTooLong,
    #[msg("This game has already been saved.")]
    GameAlreadySaved,
    #[msg("The specified game is not saved.")]
    GameNotSaved,
    #[msg("Invalid grid size. The grid exceeds maximum allowed size.")]
    InvalidGrid,
    #[msg("Min games reached - no games was saved")]
    MinGamesReached,
    #[msg("Maximum number of stars reached")]
    MaxStarsReached,
    #[msg("Minimum number of stars reached")]
    MinStarsReached,
    #[msg("Feed is full")]
    FeedFull,
    #[msg("Invalid Authority for the Feed")]
    InvalidAuthority
}