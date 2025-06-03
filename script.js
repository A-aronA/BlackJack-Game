document.addEventListener('DOMContentLoaded', () => {
    // Game state
    const state = {
        deck: [],
        playerCards: [],
        playerSplitCards: [],
        dealerCards: [],
        playerScore: 0,
        playerSplitScore: 0,
        dealerScore: 0,
        currentBet: 0,
        lastBet: 0,
        bank: 1000.00,
        safeBank: 0.00,
        gameInProgress: false,
        playerTurn: false,
        currentHand: 0, // 0 for first hand, 1 for split hand, -1 when both done
        isSplit: false,
        dealerHiddenCard: null
    };

    // Cache DOM elements
    const dealerCardsEl = document.getElementById('dealer-cards');
    const playerCardsEl = document.getElementById('player-cards');
    const playerSplitCardsEl = document.getElementById('player-split-cards');
    const dealerScoreEl = document.getElementById('dealer-score');
    const playerScoreEl = document.getElementById('player-score');
    const playerSplitScoreEl = document.getElementById('player-split-score');
    const bankAmountEl = document.getElementById('bank-amount');
    const safeBankAmountEl = document.getElementById('safe-bank-amount');
    const betAmountEl = document.getElementById('bet-amount');
    const resultTextEl = document.getElementById('result-text');
    const gameModal = document.getElementById('game-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const helpModal = document.getElementById('help-modal');
    const quitModal = document.getElementById('quit-modal');
    const playerArea = document.querySelector('.player-area');
    const playerSplitArea = document.getElementById('player-split-area');

    // Buttons
    const hitButton = document.getElementById('Button-hit');
    const standButton = document.getElementById('Button-stand');
    const doubleButton = document.getElementById('Button-double');
    const splitButton = document.getElementById('Button-split');
    const dealButton = document.getElementById('Button-deal');
    const clearBetButton = document.getElementById('Button-clear-bet');
    const rebetButton = document.getElementById('Button-rebet');
    const doubleRebetButton = document.getElementById('Button-double-rebet');
    const tripleRebetButton = document.getElementById('Button-triple-rebet');
    const modalCloseButton = document.getElementById('modal-close');
    const menuNewGameButton = document.getElementById('menu-new-game');
    const menuResetBankButton = document.getElementById('menu-reset-bank');
    const menuHelpButton = document.getElementById('menu-help');
    const menuQuitButton = document.getElementById('menu-quit');
    const closeHelpButton = document.getElementById('close-help');
    const helpCloseButton = document.getElementById('help-close-Button');
    const quitConfirmButton = document.getElementById('quit-confirm');
    const quitCancelButton = document.getElementById('quit-cancel');
    const manageSafeBankButton = document.getElementById('manage-safe-bank');

    // Chip elements
    const chips = document.querySelectorAll('.chip');

    // Load saved game state from localStorage
    function loadGameState() {
        try {
            const savedState = localStorage.getItem('blackjackGameState');
            if (savedState) {
                const { bank, safeBank } = JSON.parse(savedState);
                if (typeof bank === 'number' && bank >= 0 && typeof safeBank === 'number' && safeBank >= 0) {
                    state.bank = bank;
                    state.safeBank = safeBank;
                    console.log(`Loaded game state: bank=$${bank.toFixed(2)}, safeBank=$${safeBank.toFixed(2)}`);
                } else {
                    console.warn('Invalid saved state values, using defaults');
                    state.bank = 1000.00;
                    state.safeBank = 0.00;
                }
            } else {
                console.log('No saved state found, using defaults');
                state.bank = 1000.00;
                state.safeBank = 0.00;
            }
        } catch (e) {
            console.error('Error loading game state:', e);
            state.bank = 1000.00;
            state.safeBank = 0.00;
        }
    }

    // Save game state to localStorage
    function saveGameState() {
        try {
            const gameState = {
                bank: state.bank,
                safeBank: state.safeBank
            };
            localStorage.setItem('blackjackGameState', JSON.stringify(gameState));
            console.log(`Saved game state: bank=$${state.bank.toFixed(2)}, safeBank=$${state.safeBank.toFixed(2)}`);
        } catch (e) {
            console.error('Error saving game state:', e);
        }
    }

    // Clear saved game state
    function clearGameState() {
        try {
            localStorage.removeItem('blackjackGameState');
            console.log('Cleared saved game state');
        } catch (e) {
            console.error('Error clearing game state:', e);
        }
    }

    // Initialize game
    function initGame() {
        loadGameState(); // Load saved state
        updateBankDisplay();
        enableBetting();
        helpModal.style.display = 'none';
        gameModal.style.display = 'none';
        quitModal.style.display = 'none';
        playerSplitArea.style.display = 'none';
        playerArea.classList.remove('active-hand');
        playerSplitArea.classList.remove('active-hand');

        // Reset game state
        state.deck = createDeck();
        state.playerCards = [];
        state.playerSplitCards = [];
        state.dealerCards = [];
        state.currentBet = 0;
        state.gameInProgress = false;
        state.playerTurn = false;
        state.isSplit = false;
        state.currentHand = 0;

        // Reset UI
        dealerCardsEl.innerHTML = '';
        playerCardsEl.innerHTML = '';
        playerSplitCardsEl.innerHTML = '';
        dealerScoreEl.textContent = '0';
        playerScoreEl.textContent = '0';
        playerSplitScoreEl.textContent = '0';
        resultTextEl.textContent = '-';

        // Disable game action buttons
        disablePlayerActions();
        dealButton.disabled = true;
    }

    // Create a deck of cards
    function createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        let deck = [];

        for (let suit of suits) {
            for (let value of values) {
                let isRed = suit === '♥' || suit === '♦';
                deck.push({ value, suit, isRed });
            }
        }

        return shuffleDeck(deck);
    }

    // Shuffle the deck
    function shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    // Deal a card
    function dealCard(isHidden = false) {
        if (state.deck.length === 0) {
            state.deck = createDeck();
        }

        const card = state.deck.pop();
        return { ...card, isHidden };
    }

    // Calculate score of cards
    function calculateScore(cards) {
        let score = 0;
        let aces = 0;

        for (let card of cards) {
            if (card.isHidden) continue;

            if (card.value === 'A') {
                aces += 1;
                score += 11;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                score += 10;
            } else {
                score += parseInt(card.value);
            }
        }

        // Adjust for aces
        while (score > 21 && aces > 0) {
            score -= 10;
            aces -= 1;
        }

        return score;
    }

    // Check if hand is a Blackjack
    function isBlackjack(cards) {
        return cards.length === 2 && calculateScore(cards) === 21;
    }

    // Render card HTML
    function renderCard(card, container, animate = false) {
        if (!card || !card.value || !card.suit) {
            console.error('Invalid card object:', card);
            return;
        }

        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        if (animate) cardEl.classList.add('dealing');

        if (card.isHidden) {
            cardEl.classList.add('card-back');
        } else {
            const valueEl = document.createElement('div');
            valueEl.className = 'card-value';
            if (card.isRed) valueEl.classList.add('red');
            valueEl.textContent = card.value;

            const suitEl = document.createElement('div');
            suitEl.className = 'card-suit';
            if (card.isRed) suitEl.classList.add('red');
            suitEl.textContent = card.suit;

            cardEl.appendChild(valueEl);
            cardEl.appendChild(suitEl);
        }

        container.appendChild(cardEl);
    }

    // Update the display of all cards
    function updateCardsDisplay() {
        dealerCardsEl.innerHTML = '';
        playerCardsEl.innerHTML = '';
        playerSplitCardsEl.innerHTML = '';

        state.dealerCards.forEach((card, index) => {
            renderCard(card, dealerCardsEl);
        });
        state.playerCards.forEach((card, index) => {
            renderCard(card, playerCardsEl);
        });
        state.playerSplitCards.forEach((card, index) => {
            renderCard(card, playerSplitCardsEl);
        });

        dealerScoreEl.textContent = calculateScore(state.dealerCards);
        playerScoreEl.textContent = calculateScore(state.playerCards);
        playerSplitScoreEl.textContent = calculateScore(state.playerSplitCards);
    }

    // Check if split is possible
    function canSplit() {
        if (state.playerCards.length !== 2 || state.currentBet > state.bank) {
            return false;
        }
        const [card1, card2] = state.playerCards;
        const value1 = card1.value === 'A' ? 'A' : ['K', 'Q', 'J'].includes(card1.value) ? '10' : card1.value;
        const value2 = card2.value === 'A' ? 'A' : ['K', 'Q', 'J'].includes(card2.value) ? '10' : card2.value;
        return value1 === value2;
    }

    // Start a new round
    function startRound() {
        state.lastBet = state.currentBet;
        state.deck = createDeck();
        state.playerCards = [];
        state.playerSplitCards = [];
        state.dealerCards = [];
        state.gameInProgress = true;
        state.playerTurn = true;
        state.isSplit = false;
        state.currentHand = 0;
        playerSplitArea.style.display = 'none';
        playerArea.classList.remove('active-hand');
        playerSplitArea.classList.remove('active-hand');

        dealerCardsEl.innerHTML = '';
        playerCardsEl.innerHTML = '';
        playerSplitCardsEl.innerHTML = '';
        resultTextEl.textContent = '-';

        // Deal cards
        setTimeout(() => {
            const playerCard1 = dealCard(false);
            state.playerCards.push(playerCard1);
            renderCard(playerCard1, playerCardsEl, true);

            setTimeout(() => {
                const dealerCard1 = dealCard(false);
                state.dealerCards.push(dealerCard1);
                renderCard(dealerCard1, dealerCardsEl, true);

                setTimeout(() => {
                    const playerCard2 = dealCard(false);
                    state.playerCards.push(playerCard2);
                    renderCard(playerCard2, playerCardsEl, true);

                    setTimeout(() => {
                        const dealerCard2 = dealCard(true);
                        state.dealerHiddenCard = dealerCard2;
                        state.dealerCards.push(dealerCard2);
                        renderCard(dealerCard2, dealerCardsEl, true);

                        // Update scores
                        playerScoreEl.textContent = calculateScore(state.playerCards);
                        dealerScoreEl.textContent = calculateScore(state.dealerCards);

                        // Disable deal button after cards are dealt
                        dealButton.disabled = true;

                        // Check for blackjack
                        checkInitialBlackjack();

                        // Enable buttons
                        enablePlayerActions();
                    }, 300);
                }, 300);
            }, 300);
        }, 300);
    }

    // Player action: Hit
    function playerHit() {
        if (!state.playerTurn) return;

        const card = dealCard(false);
        const targetCards = state.currentHand === 0 ? state.playerCards : state.playerSplitCards;
        const targetScoreEl = state.currentHand === 0 ? playerScoreEl : playerSplitScoreEl;
        const targetCardsEl = state.currentHand === 0 ? playerCardsEl : playerSplitCardsEl;

        targetCards.push(card);
        renderCard(card, targetCardsEl, true);

        const score = calculateScore(targetCards);
        targetScoreEl.textContent = score;

        // Check if player busts or gets 21
        if (score > 21) {
            setTimeout(() => playerBust(), 500);
        } else if (score === 21) {
            setTimeout(() => playerStand(), 500);
        }

        // Disable double down and split after hitting
        doubleButton.disabled = true;
        splitButton.disabled = true;
    }

    // Player action: Stand
    function playerStand() {
        if (!state.playerTurn) return;

        if (state.isSplit && state.currentHand === 0) {
            // Move to second hand
            state.currentHand = 1;
            playerArea.classList.remove('active-hand');
            playerSplitArea.classList.add('active-hand');
            enablePlayerActions();
            updateCardsDisplay();
        } else {
            // Both hands done or no split
            state.playerTurn = false;
            state.currentHand = -1;
            playerArea.classList.remove('active-hand');
            playerSplitArea.classList.remove('active-hand');
            disablePlayerActions();
            revealDealerCard();
            setTimeout(dealerTurn, 800);
        }
    }

    // Player action: Double Down
    function playerDoubleDown() {
        if (!state.playerTurn || state.currentBet * 2 > state.bank) return;

        // Double the bet for the current hand
        state.bank -= state.currentBet;
        state.currentBet *= 2;
        updateBankDisplay();

        // Deal one more card and stand
        const card = dealCard(false);
        const targetCards = state.currentHand === 0 ? state.playerCards : state.playerSplitCards;
        const targetScoreEl = state.currentHand === 0 ? playerScoreEl : playerSplitScoreEl;
        const targetCardsEl = state.currentHand === 0 ? playerCardsEl : playerSplitCardsEl;

        targetCards.push(card);
        renderCard(card, targetCardsEl, true);

        const score = calculateScore(targetCards);
        targetScoreEl.textContent = score;

        // Check if player busts
        if (score > 21) {
            setTimeout(() => playerBust(), 500);
        } else {
            setTimeout(() => playerStand(), 500);
        }
    }

    // Player action: Split
    function playerSplit() {
        if (!state.playerTurn || !canSplit() || state.currentBet > state.bank) return;

        // Deduct bet for second hand
        state.bank -= state.currentBet;
        updateBankDisplay();

        // Initialize split
        state.isSplit = true;
        state.playerSplitCards = [state.playerCards.pop()];
        state.currentHand = 0;
        playerSplitArea.style.display = 'block';
        playerArea.classList.add('active-hand');
        playerSplitArea.classList.remove('active-hand');

        // Update UI to show initial split
        updateCardsDisplay();

        // Deal new cards with animation
        setTimeout(() => {
            const card1 = dealCard(false);
            state.playerCards.push(card1);
            renderCard(card1, playerCardsEl, true);
            playerScoreEl.textContent = calculateScore(state.playerCards);

            // Check for Blackjack on first hand
            if (isBlackjack(state.playerCards)) {
                const blackjackPayout = state.currentBet * 1.5;
                state.bank += state.currentBet + blackjackPayout;
                updateBankDisplay();
                state.currentHand = 1;
                playerArea.classList.remove('active-hand');
                playerSplitArea.classList.add('active-hand');
                setTimeout(() => {
                    const card2 = dealCard(false);
                    state.playerSplitCards.push(card2);
                    renderCard(card2, playerSplitCardsEl, true);
                    playerSplitScoreEl.textContent = calculateScore(state.playerSplitCards);

                    // Check for Blackjack on second hand
                    if (isBlackjack(state.playerSplitCards)) {
                        const blackjackPayout2 = state.currentBet * 1.5;
                        state.bank += state.currentBet + blackjackPayout2;
                        updateBankDisplay();
                        state.playerTurn = false;
                        state.currentHand = -1;
                        playerSplitArea.classList.remove('active-hand');
                        disablePlayerActions();
                        revealDealerCard();
                        setTimeout(() => endRound("Hand 1: Blackjack! You win $" + blackjackPayout.toFixed(2) + "!\nHand 2: Blackjack! You win $" + blackjackPayout2.toFixed(2) + "!", "Split Blackjacks"), 800);
                    } else {
                        enablePlayerActions();
                    }
                }, 300);
            } else {
                setTimeout(() => {
                    const card2 = dealCard(false);
                    state.playerSplitCards.push(card2);
                    renderCard(card2, playerSplitCardsEl, true);
                    playerSplitScoreEl.textContent = calculateScore(state.playerSplitCards);

                    // Check for Blackjack on second hand
                    if (isBlackjack(state.playerSplitCards)) {
                        const blackjackPayout = state.currentBet * 1.5;
                        state.bank += state.currentBet + blackjackPayout;
                        updateBankDisplay();
                        state.playerTurn = false;
                        state.currentHand = -1;
                        playerArea.classList.remove('active-hand');
                        playerSplitArea.classList.remove('active-hand');
                        disablePlayerActions();
                        revealDealerCard();
                        setTimeout(() => endRound("Hand 1: Continue playing.\nHand 2: Blackjack! You win $" + blackjackPayout.toFixed(2) + "!", "Split Blackjack"), 800);
                    } else {
                        enablePlayerActions();
                    }
                }, 300);
            }
        }, 300);
    }

    // Player busts
    function playerBust() {
        const score = calculateScore(state.currentHand === 0 ? state.playerCards : state.playerSplitCards);
        if (state.isSplit && state.currentHand === 0) {
            // First hand busts, move to second hand
            state.currentHand = 1;
            playerArea.classList.remove('active-hand');
            playerSplitArea.classList.add('active-hand');
            enablePlayerActions();
            updateCardsDisplay();
        } else {
            // Second hand or no split
            state.playerTurn = false;
            state.currentHand = -1;
            playerArea.classList.remove('active-hand');
            playerSplitArea.classList.remove('active-hand');
            disablePlayerActions();
            resultTextEl.textContent = "Bust!";
            revealDealerCard();
            setTimeout(() => endRound("You bust! Dealer wins."), 1000);
        }
    }

    // Reveal dealer's hidden card
    function revealDealerCard() {
        if (state.dealerHiddenCard) {
            state.dealerHiddenCard.isHidden = false;
            updateCardsDisplay();
        }
    }

    // Dealer's turn
    function dealerTurn() {
        const playerScore = calculateScore(state.playerCards);
        const playerSplitScore = calculateScore(state.playerSplitCards);

        if ((playerScore > 21 && (!state.isSplit || playerSplitScore > 21)) || (state.isSplit && playerScore > 21 && playerSplitScore > 21)) {
            endRound("You bust! Dealer wins.");
            return;
        }

        const dealerPlay = () => {
            const dealerScore = calculateScore(state.dealerCards);

            // Dealer must draw until 17 or higher
            if (dealerScore < 17) {
                const card = dealCard(false);
                state.dealerCards.push(card);
                renderCard(card, dealerCardsEl, true);
                dealerScoreEl.textContent = calculateScore(state.dealerCards);

                setTimeout(dealerPlay, 800);
            } else {
                // Determine winner
                determineWinner();
            }
        };

        dealerPlay();
    }

    // Check for blackjack on initial deal
    function checkInitialBlackjack() {
        const playerScore = calculateScore(state.playerCards);
        const dealerScore = calculateScore(state.dealerCards.map(card => ({ ...card, isHidden: false })));

        if (playerScore === 21 && state.playerCards.length === 2) {
            // Player has blackjack
            if (dealerScore === 21 && state.dealerCards.length === 2) {
                // Both have blackjack - push
                revealDealerCard();
                setTimeout(() => endRound("Push! Both have Blackjack.", "Push"), 800);
            } else {
                // Player wins with blackjack (pays 3:2)
                const blackjackPayout = state.currentBet * 1.5;
                state.bank += state.currentBet + blackjackPayout;
                updateBankDisplay();
                setTimeout(() => endRound(`Blackjack! You win $${blackjackPayout.toFixed(2)}!`, "Blackjack"), 800);
            }
            state.playerTurn = false;
            disablePlayerActions();
            return true;
        } else if (dealerScore === 21 && state.dealerCards.length === 2) {
            // Dealer has blackjack
            revealDealerCard();
            setTimeout(() => endRound("Dealer has Blackjack! You lose.", "Loss"), 800);
            state.playerTurn = false;
            disablePlayerActions();
            return true;
        }

        return false;
    }

    // Determine the winner
    function determineWinner() {
        const dealerScore = calculateScore(state.dealerCards);
        let message = "";
        let winnings = 0;

        // Handle first hand
        const playerScore = calculateScore(state.playerCards);
        if (playerScore <= 21) {
            if (isBlackjack(state.playerCards)) {
                const blackjackPayout = state.currentBet * 1.5;
                winnings += state.currentBet + blackjackPayout;
                message += `Hand 1: Blackjack! You win $${blackjackPayout.toFixed(2)}!\n`;
            } else if (dealerScore > 21) {
                winnings += state.currentBet * 2;
                message += `Hand 1: Dealer busts! You win $${state.currentBet.toFixed(2)}!\n`;
            } else if (playerScore > dealerScore) {
                winnings += state.currentBet * 2;
                message += `Hand 1: You win $${state.currentBet.toFixed(2)}!\n`;
            } else if (dealerScore > playerScore) {
                message += `Hand 1: Dealer wins!\n`;
            } else {
                winnings += state.currentBet;
                message += `Hand 1: Push! Bet returned.\n`;
            }
        } else {
            message += `Hand 1: Bust! Dealer wins.\n`;
        }

        // Handle second hand if split
        if (state.isSplit) {
            const playerSplitScore = calculateScore(state.playerSplitCards);
            if (playerSplitScore <= 21) {
                if (isBlackjack(state.playerSplitCards)) {
                    const blackjackPayout = state.currentBet * 1.5;
                    winnings += state.currentBet + blackjackPayout;
                    message += `Hand 2: Blackjack! You win $${blackjackPayout.toFixed(2)}!\n`;
                } else if (dealerScore > 21) {
                    winnings += state.currentBet * 2;
                    message += `Hand 2: Dealer busts! You win $${state.currentBet.toFixed(2)}!\n`;
                } else if (playerSplitScore > dealerScore) {
                    winnings += state.currentBet * 2;
                    message += `Hand 2: You win $${state.currentBet.toFixed(2)}!\n`;
                } else if (dealerScore > playerSplitScore) {
                    message += `Hand 2: Dealer wins!\n`;
                } else {
                    winnings += state.currentBet;
                    message += `Hand 2: Push! Bet returned.\n`;
                }
            } else {
                message += `Hand 2: Bust! Dealer wins.\n`;
            }
        }

        state.bank += winnings;
        updateBankDisplay();
        endRound(message.trim(), state.isSplit ? "Split Round" : "Standard");
    }

    // End the round
    function endRound(message, winType = "") {
        resultTextEl.textContent = message;
        state.gameInProgress = false;
        state.playerTurn = false;
        state.currentHand = -1;
        playerArea.classList.remove('active-hand');
        playerSplitArea.classList.remove('active-hand');
        disablePlayerActions();

        // Show game result modal with win type
        modalTitle.textContent = "Game Result";
        modalMessage.textContent = `${message}${winType ? `\n(${winType})` : ""}`;
        if (state.bank <= 0) {
            modalMessage.textContent += "\nYou're out of money! Use 'Reset Bank' or 'Manage Safe Bank' to continue.";
        }
        gameModal.style.display = 'flex';

        // Re-enable betting and disable deal button
        enableBetting();
        dealButton.disabled = true;
    }

    // Update bank and bet display
    function updateBankDisplay() {
        bankAmountEl.textContent = `$${state.bank.toFixed(2)}`;
        safeBankAmountEl.textContent = `$${state.safeBank.toFixed(2)}`;
        betAmountEl.textContent = `$${state.currentBet.toFixed(2)}`;
        dealButton.disabled = state.currentBet === 0 || state.gameInProgress;
        clearBetButton.disabled = state.currentBet === 0 || state.gameInProgress;
        rebetButton.disabled = state.gameInProgress || state.lastBet === 0 || state.bank < state.lastBet;
        doubleRebetButton.disabled = state.gameInProgress || state.lastBet === 0 || state.bank < state.lastBet * 2;
        tripleRebetButton.disabled = state.gameInProgress || state.lastBet === 0 || state.bank < state.lastBet * 3;
        saveGameState(); // Save state whenever bank or safeBank changes
    }

    // Enable betting
    function enableBetting() {
        chips.forEach(chip => chip.style.pointerEvents = state.bank > 0 ? 'auto' : 'none');
        clearBetButton.disabled = state.currentBet === 0 || state.gameInProgress;
        rebetButton.disabled = state.gameInProgress || state.lastBet === 0 || state.bank < state.lastBet;
        doubleRebetButton.disabled = state.gameInProgress || state.lastBet === 0 || state.bank < state.lastBet * 2;
        tripleRebetButton.disabled = state.gameInProgress || state.lastBet === 0 || state.bank < state.lastBet * 3;
    }

    // Disable betting
    function disableBetting() {
        chips.forEach(chip => chip.style.pointerEvents = 'none');
        clearBetButton.disabled = true;
        rebetButton.disabled = true;
        doubleRebetButton.disabled = true;
        tripleRebetButton.disabled = true;
    }

    // Enable player actions
    function enablePlayerActions() {
        hitButton.disabled = false;
        standButton.disabled = false;

        // Enable double down only if player has enough money and hasn't hit yet
        const targetCards = state.currentHand === 0 ? state.playerCards : state.playerSplitCards;
        doubleButton.disabled = state.currentBet * 2 > state.bank || targetCards.length > 2;

        // Enable split only for first hand, two cards, same value, and enough bank
        splitButton.disabled = state.currentHand !== 0 || !canSplit() || targetCards.length !== 2;

        // Highlight active hand
        if (state.currentHand === 0) {
            playerArea.classList.add('active-hand');
            playerSplitArea.classList.remove('active-hand');
        } else if (state.currentHand === 1) {
            playerArea.classList.remove('active-hand');
            playerSplitArea.classList.add('active-hand');
        }
    }

    // Disable player actions
    function disablePlayerActions() {
        hitButton.disabled = true;
        standButton.disabled = true;
        doubleButton.disabled = true;
        splitButton.disabled = true;
        playerArea.classList.remove('active-hand');
        playerSplitArea.classList.remove('active-hand');
    }

    // Withdraw to safe bank
    function withdrawToSafeBank() {
        if (state.gameInProgress) {
            alert("Cannot manage safe bank during an active game.");
            return;
        }

        if (state.bank < 1000) {
            alert("Current bank must be at least $1000.00 to withdraw to safe bank.");
            return;
        }

        const maxWithdraw = state.bank - 1000;
        const input = prompt(`Enter amount to withdraw to safe bank (max $${maxWithdraw.toFixed(2)}):`);
        if (input === null) return;

        const amount = parseFloat(input);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid positive amount.");
            return;
        }

        if (amount > maxWithdraw) {
            alert(`Amount exceeds maximum withdrawal of $${maxWithdraw.toFixed(2)}.`);
            return;
        }

        state.bank -= amount;
        state.safeBank += amount;
        updateBankDisplay();
        alert(`Successfully withdrew $${amount.toFixed(2)} to safe bank.`);
    }

    // Deposit from safe bank
    function depositFromSafeBank() {
        if (state.gameInProgress) {
            alert("Cannot manage safe bank during an active game.");
            return;
        }

        if (state.safeBank <= 0) {
            alert("Safe bank is empty.");
            return;
        }

        const input = prompt(`Enter amount to deposit from safe bank (max $${state.safeBank.toFixed(2)}):`);
        if (input === null) return;

        const amount = parseFloat(input);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid positive amount.");
            return;
        }

        if (amount > state.safeBank) {
            alert(`Amount exceeds safe bank balance of $${state.safeBank.toFixed(2)}.`);
            return;
        }

        state.safeBank -= amount;
        state.bank += amount;
        updateBankDisplay();
        alert(`Successfully deposited $${amount.toFixed(2)} to current bank.`);
    }

    // Manage safe bank
    function manageSafeBank() {
        const action = prompt("Enter 'w' to withdraw money into safe bank or 'd' to deposit money to current bank:");
        if (action === null) return;

        const normalizedAction = action.toLowerCase().trim();
        if (normalizedAction === 'w') {
            withdrawToSafeBank();
        } else if (normalizedAction === 'd') {
            depositFromSafeBank();
        } else {
            alert("Invalid action. Please enter 'w' or 'd'.");
        }
    }

    // Event Listeners
    // Chip selection for betting
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (state.gameInProgress || state.bank <= 0) return;

            const value = parseFloat(chip.dataset.value);
            if (state.bank >= value) {
                state.currentBet += value;
                state.bank -= value;
                chip.classList.add('chip-flash');
                setTimeout(() => chip.classList.remove('chip-flash'), 300);
                updateBankDisplay();
            }
        });
    });

    // Clear bet
    clearBetButton.addEventListener('click', () => {
        if (state.gameInProgress) return;

        state.bank += state.currentBet;
        state.currentBet = 0;
        updateBankDisplay();
    });

    // Rebet and start round
    rebetButton.addEventListener('click', () => {
        if (state.gameInProgress || state.lastBet === 0 || state.bank < state.lastBet) return;

        state.currentBet = state.lastBet;
        state.bank -= state.lastBet;
        updateBankDisplay();
        disableBetting();
        startRound();
    });

    // Double Rebet and start round
    doubleRebetButton.addEventListener('click', () => {
        if (state.gameInProgress || state.lastBet === 0 || state.bank < state.lastBet * 2) return;

        state.currentBet = state.lastBet * 2;
        state.bank -= state.lastBet * 2;
        updateBankDisplay();
        disableBetting();
        startRound();
    });

    // Triple Rebet and start round
    tripleRebetButton.addEventListener('click', () => {
        if (state.gameInProgress || state.lastBet === 0 || state.bank < state.lastBet * 3) return;

        state.currentBet = state.lastBet * 3;
        state.bank -= state.lastBet * 3;
        updateBankDisplay();
        disableBetting();
        startRound();
    });

    // Deal button
    dealButton.addEventListener('click', () => {
        if (state.currentBet > 0 && !state.gameInProgress) {
            disableBetting();
            startRound();
        }
    });

    // Hit button
    hitButton.addEventListener('click', playerHit);

    // Stand button
    standButton.addEventListener('click', playerStand);

    // Double down button
    doubleButton.addEventListener('click', playerDoubleDown);

    // Split button
    splitButton.addEventListener('click', playerSplit);

    // Manage safe bank button
    manageSafeBankButton.addEventListener('click', manageSafeBank);

    // Menu: New Game
    menuNewGameButton.addEventListener('click', () => {
        if (state.bank <= 0) {
            modalTitle.textContent = "No Funds";
            modalMessage.textContent = "You're out of money! Use 'Reset Bank' or 'Manage Safe Bank' to continue.";
            gameModal.style.display = 'flex';
        } else {
            initGame();
        }
    });

    // Menu: Reset Bank
    menuResetBankButton.addEventListener('click', () => {
        state.bank = 1000.00;
        state.safeBank = 0.00;
        state.currentBet = 0;
        state.lastBet = 0;
        clearGameState(); // Clear saved state
        initGame();
        alert('Bank and safe bank reset to default values. Progress cleared.');
    });

    // Menu: Help
    menuHelpButton.addEventListener('click', () => {
        helpModal.style.display = 'flex';
    });

    // Menu: Quit
    menuQuitButton.addEventListener('click', () => {
        saveGameState(); // Explicitly save before showing quit modal
        quitModal.style.display = 'flex';
    });

    // Close help modal
    closeHelpButton.addEventListener('click', () => {
        helpModal.style.display = 'none';
    });
    helpCloseButton.addEventListener('click', () => {
        helpModal.style.display = 'none';
    });

    // Modal: Close
    modalCloseButton.addEventListener('click', () => {
        gameModal.style.display = 'none';
        if (state.bank <= 0) {
            // Disable betting chips when bank is empty
            enableBetting();
        } else {
            initGame();
        }
    });

    // Quit: Confirm
    quitConfirmButton.addEventListener('click', () => {
        saveGameState(); // Save state before quitting
        window.close();
        quitModal.style.display = 'none';
    });

    // Quit: Cancel
    quitCancelButton.addEventListener('click', () => {
        quitModal.style.display = 'none';
    });

    // Save state before tab closes
    window.addEventListener('beforeunload', () => {
        saveGameState();
    });

    // Initialize the game when the page loads
    initGame();
});