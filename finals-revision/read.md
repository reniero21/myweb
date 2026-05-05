readme_content = """# CryptoDashboard

A modern, responsive, and feature-rich cryptocurrency tracking dashboard built with Vanilla JavaScript, CSS3, and HTML5. This application fetches real-time market data from the CoinGecko API to provide users with up-to-date information on the top 50 cryptocurrencies.

## 🚀 Features

- **Real-Time Market Data**: Displays price, market cap, 24h volume, and price changes (1h and 24h) for the top 50 coins.
- **Global Statistics**: A dedicated header section showing total Market Cap, 24h Trading Volume, and Bitcoin (BTC) Dominance.
- **Interactive Sparklines**: Visual 7-day price trends rendered using dynamic inline SVGs.
- **Search & Filter**: Instantly filter coins by name or symbol using the search bar.
- **Persistent Favorites**: Save your preferred coins to a "Favorites" list, which persists across sessions using `localStorage`.
- **Dynamic Sorting**: Sort the data table by Rank, Name, Price, Market Cap, Volume, or Percentage changes in both ascending and descending order.
- **Dual Theme Support**: Seamless switching between Dark and Light modes.
- **Auto-Refresh**: Configurable data refresh intervals (15s, 30s, 1m, 2m) with a visual countdown timer.

Project Structure

```text
finals-revision/
├── index.html      # Main application structure and layout
├── CSS/
│   └── style.css   # Custom styles, themes, and responsive design
└── JS/
    └── script.js    # Application logic, API integration, and DOM manipulation