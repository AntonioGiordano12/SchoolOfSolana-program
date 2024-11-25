/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/game_of_life.json`.
 */
export type GameOfLifePda = {
  "address": "Ge1ccFAwTuKgMY3AYpa9QsU5xCWce9iRiGiSaFa6NL1j",
  "metadata": {
    "name": "gameOfLife",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "gameOwner",
          "writable": true,
          "signer": true
        },
        {
          "name": "feed",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  70,
                  69,
                  69,
                  68,
                  95,
                  83,
                  69,
                  69,
                  68
                ]
              }
            ]
          }
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  71,
                  65,
                  77,
                  69,
                  95,
                  83,
                  69,
                  69,
                  68
                ]
              },
              {
                "kind": "account",
                "path": "gameOwner"
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "string"
        },
        {
          "name": "aliveCells",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "initializeFeed",
      "discriminator": [
        167,
        251,
        140,
        58,
        66,
        138,
        187,
        95
      ],
      "accounts": [
        {
          "name": "feed",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  70,
                  69,
                  69,
                  68,
                  95,
                  83,
                  69,
                  69,
                  68
                ]
              }
            ]
          }
        },
        {
          "name": "feedAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
                  100,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "starGame",
      "discriminator": [
        7,
        195,
        102,
        143,
        78,
        227,
        72,
        245
      ],
      "accounts": [
        {
          "name": "starUser",
          "writable": true,
          "signer": true
        },
        {
          "name": "staredGame",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  83,
                  84,
                  65,
                  82,
                  95,
                  83,
                  69,
                  69,
                  68
                ]
              },
              {
                "kind": "account",
                "path": "starUser"
              },
              {
                "kind": "account",
                "path": "game"
              }
            ]
          }
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  71,
                  65,
                  77,
                  69,
                  95,
                  83,
                  69,
                  69,
                  68
                ]
              },
              {
                "kind": "account",
                "path": "game.game_author",
                "account": "game"
              },
              {
                "kind": "account",
                "path": "game.game_id [.. game.id_length as usize]",
                "account": "game"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "unstarGame",
      "discriminator": [
        182,
        35,
        113,
        177,
        14,
        91,
        154,
        67
      ],
      "accounts": [
        {
          "name": "starUser",
          "writable": true,
          "signer": true
        },
        {
          "name": "starGame",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  83,
                  84,
                  65,
                  82,
                  95,
                  83,
                  69,
                  69,
                  68
                ]
              },
              {
                "kind": "account",
                "path": "starUser"
              },
              {
                "kind": "account",
                "path": "game"
              }
            ]
          }
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  71,
                  65,
                  77,
                  69,
                  95,
                  83,
                  69,
                  69,
                  68
                ]
              },
              {
                "kind": "account",
                "path": "game.game_author",
                "account": "game"
              },
              {
                "kind": "account",
                "path": "game.game_id [.. game.id_length as usize]",
                "account": "game"
              }
            ]
          }
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "feed",
      "discriminator": [
        69,
        191,
        16,
        227,
        132,
        187,
        84,
        227
      ]
    },
    {
      "name": "game",
      "discriminator": [
        27,
        90,
        166,
        125,
        74,
        100,
        121,
        18
      ]
    },
    {
      "name": "star",
      "discriminator": [
        214,
        131,
        207,
        208,
        202,
        148,
        162,
        48
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "idTooLong",
      "msg": "Cannot initialize,ID too long"
    },
    {
      "code": 6001,
      "name": "gameAlreadySaved",
      "msg": "This game has already been saved."
    },
    {
      "code": 6002,
      "name": "gameNotSaved",
      "msg": "The specified game is not saved."
    },
    {
      "code": 6003,
      "name": "invalidGrid",
      "msg": "Invalid grid size. The grid exceeds maximum allowed size."
    },
    {
      "code": 6004,
      "name": "minGamesReached",
      "msg": "Min games reached - no games was saved"
    },
    {
      "code": 6005,
      "name": "maxStarsReached",
      "msg": "Maximum number of stars reached"
    },
    {
      "code": 6006,
      "name": "minStarsReached",
      "msg": "Minimum number of stars reached"
    },
    {
      "code": 6007,
      "name": "feedFull",
      "msg": "Feed is full"
    },
    {
      "code": 6008,
      "name": "invalidAuthority",
      "msg": "Invalid Authority for the Feed"
    }
  ],
  "types": [
    {
      "name": "feed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "games",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "game",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gameAuthor",
            "type": "pubkey"
          },
          {
            "name": "gameId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "idLength",
            "type": "u8"
          },
          {
            "name": "aliveCells",
            "type": {
              "array": [
                "u8",
                512
              ]
            }
          },
          {
            "name": "iteration",
            "type": "u64"
          },
          {
            "name": "stars",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "star",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "starUser",
            "type": "pubkey"
          },
          {
            "name": "game",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
