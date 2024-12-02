import { AnchorProvider, getProvider, Program, setProvider } from '@coral-xyz/anchor';
import { FC, useEffect, useState } from 'react';
import { GameOfLife } from './game_of_life';
import idl from './game_of_life.json'
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { FEED_SEED, STAR_SEED } from '../constants';
import { CreateGameOfLife } from './GameOfLife';
import { GamePlayer } from './GamePlayer';
import { GameCreator } from './GameCreator';

const idl_string = JSON.stringify(idl)
const idl_object = JSON.parse(idl_string)
const programID = new PublicKey(idl.address)

interface GameData {
    gameId: string;
    gameAuthor: PublicKey;
    aliveCells: boolean[][];
    stars: number;
    pubkey: PublicKey;
}

interface GameBoxProps {
    game: GameData;
    onClick?: () => void;
    isOwner: boolean;
}

const GameBox: FC<GameBoxProps> = ({ game, onClick, isOwner }) => {
    // Create a mini preview of the game using alive_cells
    const renderPreview = () => {
        return (
            <div className="grid" style={{ 
                gridTemplateColumns: 'repeat(64, 1fr)',
                width: '100%',
                height: '100%'
            }}>
                {game.aliveCells.map((row, rowIndex) => (
                    row.map((cell, colIndex) => (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`${cell ? 'bg-indigo-500' : 'bg-white'} border-[0.5px] border-gray-200`}
                        />
                    ))
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center cursor-pointer" onClick={onClick}>
            <span className="text-sm font-bold text-white">{game.gameId}</span>
            <div className="w-64 h-64 bg-white border-2 border-gray-200 rounded-lg overflow-hidden mb-2">
                <div className="p-4 h-full flex items-center justify-center">
                    {renderPreview()}
                </div>
            </div>
            <div className="flex items-center text-sm text-gray-400">
                <span>⭐ {game.stars}</span>
            </div>
        </div>
    );
};

interface GameSectionProps {
    title: string;
    games: GameData[];
    onGameSelect: (game: GameData) => void;
    currentWallet: PublicKey | null;
}

const GameSection: FC<GameSectionProps> = ({ title, games, onGameSelect, currentWallet }) => {
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">{title}</h2>
            <div className="grid grid-cols-4 gap-4 max-w-[1400px] mx-auto">
                {games.map((game, index) => (
                    <GameBox 
                        key={index} 
                        game={game} 
                        onClick={() => onGameSelect(game)}
                        isOwner={currentWallet?.equals(game.gameAuthor) || false}
                    />
                ))}
            </div>
        </div>
    );
};

export const GameGallery: FC = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [allGamesData, setAllGamesData] = useState<GameData[]>([]);
    const [myGames, setMyGames] = useState<GameData[]>([]);
    const [starredGames, setStarredGames] = useState<GameData[]>([]);
    const [otherGames, setOtherGames] = useState<GameData[]>([]);
    const [selectedGame, setSelectedGame] = useState<GameData | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Convert byte array to string, removing null bytes
    const byteArrayToString = (bytes: number[]): string => {
        // Filter out null bytes (0) and convert to string
        const nonNullBytes = bytes.filter(byte => byte !== 0);
        const uint8Array = new Uint8Array(nonNullBytes);
        try {
            return new TextDecoder().decode(uint8Array);
        } catch (error) {
            console.error("Error decoding bytes:", error);
            return "Unnamed Game"; // Fallback value
        }
    };

    function deserializeBitmap(bitmap: Uint8Array): Array<[number, number]> {
        const gridSize = 64;
        const aliveCells: Array<[number, number]> = [];
        for (let byteIndex = 0; byteIndex < bitmap.length; byteIndex++) {
            const byte = bitmap[byteIndex];
            for (let bitOffset = 0; bitOffset < 8; bitOffset++) {
                if ((byte & (1 << bitOffset)) !== 0) {
                    const bitIndex = byteIndex * 8 + bitOffset;
                    const row = Math.floor(bitIndex / gridSize);
                    const col = bitIndex % gridSize;
                    aliveCells.push([row, col]);
                }
            }
        }
        return aliveCells;
    }

    function convertToGrid(aliveCellsCoords: Array<[number, number]>): boolean[][] {
        const gridSize = 64;
        const grid = Array(gridSize).fill(false).map(() => Array(gridSize).fill(false));
        aliveCellsCoords.forEach(([row, col]) => {
            if (row < gridSize && col < gridSize) {
                grid[row][col] = true;
            }
        });
        return grid;
    }

    const transformGameData = (gameData: any, gamePubkey: PublicKey): GameData => {
        const gameIdString = byteArrayToString(Array.from(gameData.gameId));
        return {
            gameId: gameIdString,
            gameAuthor: gameData.gameAuthor,
            aliveCells: convertToGrid(deserializeBitmap(new Uint8Array(gameData.aliveCells))),
            stars: gameData.stars ? gameData.stars.toNumber() : 0,
            pubkey: gamePubkey,
        };
    };

    const fetchGames = async () => {
        setIsLoading(true);
        try {
            const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
            setProvider(provider);
            const program = new Program<GameOfLife>(idl_object, provider);

            // Get all games
            const [feedPda] = PublicKey.findProgramAddressSync([Buffer.from(FEED_SEED)], program.programId);
            const feedAccount = await program.account.feed.fetch(feedPda);
            const games = await Promise.all(
                feedAccount.games.map(async (gamePubkey) => {
                    const gameData = await program.account.game.fetch(gamePubkey);
                    return transformGameData(gameData, gamePubkey);
                })
            );

            // Filter games into categories
            const myGames = games.filter(game => game.gameAuthor.equals(wallet.publicKey!));
            
            // Get starred games by checking if star PDA exists
            const starredGames = await Promise.all(
                games.map(async (game) => {
                    const [starPda] = PublicKey.findProgramAddressSync(
                        [Buffer.from(STAR_SEED), wallet.publicKey!.toBuffer(), game.pubkey.toBuffer()],
                        programID
                    );
                    try {
                        await program.account.star.fetch(starPda);
                        return game;
                    } catch {
                        return null;
                    }
                })
            );
            
            const confirmedStarredGames = starredGames.filter((game): game is GameData => game !== null);
            
            setStarredGames(confirmedStarredGames);
            setMyGames(myGames);
            setOtherGames(games.filter(game => 
                !game.gameAuthor.equals(wallet.publicKey!) && 
                !confirmedStarredGames.some(starred => starred.pubkey.equals(game.pubkey))
            ));
        } catch (error) {
            console.error("Error fetching games:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGameSelect = (game: GameData) => {
        setSelectedGame(game);
    };

    if (isCreating) {
        return (
            <div className="max-w-[1280px] mx-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Create New Game</h1>
                    <button
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg cursor-pointer"
                        onClick={() => setIsCreating(false)}
                    >
                        Back to Gallery
                    </button>
                </div>
                <GameCreator 
                    onGameCreated={() => {
                        setIsCreating(false);
                        fetchGames();
                    }}
                />
            </div>
        );
    }

    if (selectedGame) {
        return (
            <div className="max-w-[1280px] mx-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Play a game</h1>
                    <button
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg cursor-pointer"
                        onClick={() => setSelectedGame(null)}
                    >
                        Back to Gallery
                    </button>
                </div>
                <GamePlayer 
                    gameData={selectedGame}
                    onExit={() => setSelectedGame(null)}
                />
            </div>
        );
    }

    return (
        <div className="max-w-[1280px] mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-white">Game Gallery</h1>
                <div className="flex gap-4">
                    <button
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer"
                        onClick={fetchGames}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : 'Refresh Games'}
                    </button>
                    <button
                        className="px-4 py-2 bg-green-500 text-white rounded-lg cursor-pointer"
                        onClick={() => setIsCreating(true)}
                    >
                        Create New Game
                    </button>
                </div>
            </div>

            {wallet.publicKey && myGames.length > 0 && (
                <GameSection 
                    title="My Games" 
                    games={myGames} 
                    onGameSelect={handleGameSelect}
                    currentWallet={wallet.publicKey}
                />
            )}
            {starredGames.length > 0 && (
                <GameSection 
                    title="Starred Games" 
                    games={starredGames} 
                    onGameSelect={handleGameSelect}
                    currentWallet={wallet.publicKey}
                />
            )}
            {otherGames.length > 0 && (
                <GameSection 
                    title="Other Games" 
                    games={otherGames} 
                    onGameSelect={handleGameSelect}
                    currentWallet={wallet.publicKey}
                />
            )}

            {!isLoading && myGames.length === 0 && starredGames.length === 0 && otherGames.length === 0 && (
                <div className="text-center text-gray-400 mt-8">
                    No games found. Click "Refresh Games" to fetch games or create a new one!
                </div>
            )}
        </div>
    );
};
