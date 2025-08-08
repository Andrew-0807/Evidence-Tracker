# Evidence Tracker - Tauri Native Application

A native desktop application built with Tauri and React for tracking daily activities and expenses with customizable tags and monthly overviews.

## Features

- **Native Desktop App**: Built with Tauri for cross-platform compatibility (Windows, macOS, Linux)
- **SQLite Database**: Local data storage with automatic backups
- **Customizable Tags**: Easy-to-modify tag system with color coding
- **Auto-Lock Past Days**: Automatically locks days that have already passed
- **Live Configuration Updates**: Real-time updates when tags.json file is modified
- **Daily Entry Tracking**: Add, edit, and delete entries with amount tracking
- **Day Locking**: Lock completed days to prevent accidental modifications
- **Monthly Overview**: Visual analysis of spending patterns by month
- **Bulk Entry Support**: Add multiple entries at once with text parsing
- **Responsive UI**: Modern, clean interface built with Tailwind CSS

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Rust](https://rustup.rs/) (latest stable version)
- [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) for your operating system

### Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Evidence\ Tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Tauri CLI** (if not already installed):
   ```bash
   npm install -g @tauri-apps/cli
   ```

4. **Generate application icons** (optional):
   ```bash
   # Place a 1024x1024 PNG icon as app-icon.png in the root directory
   npx tauri icon
   ```

## Development

### Running in Development Mode

```bash
npm run dev
```

This will start the development server and launch the Tauri application window.

### Building for Production

```bash
npm run build
```

The built application will be available in `src-tauri/target/release/bundle/`.

## Configuration

### Customizing Tags

The application uses a configurable tag system with **live file watching**. Tags can be managed through the application interface or by directly editing the configuration file:

1. **Location**: Tags are stored in your system's config directory:
   - Windows: `%APPDATA%\evidence-tracker\tags.json`
   - macOS: `~/Library/Application Support/evidence-tracker/tags.json`
   - Linux: `~/.config/evidence-tracker/tags.json`

2. **Live Updates**: The application automatically watches the `tags.json` file for changes. When you modify the file externally, the app will instantly update without requiring a restart.

3. **Format**: The `tags.json` file has the following structure:
   ```json
   {
     "available_tags": [
       "Work",
       "Personal",
       "Health",
       "Finance",
       "Education"
     ],
     "tag_colors": {
       "Work": "bg-blue-100 text-blue-800 border-blue-200",
       "Personal": "bg-purple-100 text-purple-800 border-purple-200",
       "Health": "bg-green-100 text-green-800 border-green-200",
       "Finance": "bg-yellow-100 text-yellow-800 border-yellow-200",
       "Education": "bg-indigo-100 text-indigo-800 border-indigo-200"
     }
   }
   ```

4. **Color Classes**: Use Tailwind CSS classes for styling. Available color combinations:
   - `bg-[color]-100 text-[color]-800 border-[color]-200`
   - Supported colors: `blue`, `purple`, `green`, `yellow`, `indigo`, `pink`, `red`, `orange`, `cyan`, `emerald`, `slate`, `gray`

5. **External Editing**: You can edit the `tags.json` file with any text editor while the application is running. Changes will be reflected immediately in the interface.

### Database Location

The SQLite database is stored at:
- Windows: `%APPDATA%\evidence-tracker\entries.db`
- macOS: `~/Library/Application Support/evidence-tracker/entries.db`
- Linux: `~/.config/evidence-tracker/entries.db`

## Usage

### Adding Entries

1. **Single Entry**:
   - Select a tag from the dropdown
   - Enter the amount (positive or negative)
   - Click "Add Entry"

2. **Bulk Entry**:
   - Use the bulk entry format: `Tag: Amount`
   - Multiple entries on separate lines:
     ```
     Work: 45.50
     Personal: 12.75
     Health: 25.00
     ```
   - Click "Parse & Add Entries"

### Managing Tags

1. **Add New Tag**:
   - Enter tag name in the "Manage Tags" section
   - Click "Add" button

2. **Remove Tag**:
   - Click the delete icon next to any tag
   - Confirm deletion

### Day Locking

1. **Auto-Lock Past Days**:
   - Days that have already passed are automatically locked when accessed
   - No confirmation required - happens silently in the background
   - Prevents accidental modifications to historical data

2. **Manual Lock**:
   - Add all entries for the day
   - Click "Lock Day" in the Daily Summary section
   - Confirm the action

3. **Locked Day Restrictions**:
   - Cannot add new entries
   - Cannot edit existing entries
   - Cannot delete entries
   - UI clearly indicates if a day is auto-locked vs manually locked

### Monthly Overview

1. **Access Overview**:
   - Click "View Overview" in the header
   - Select a month from the sidebar
   - View spending breakdown by category

2. **Features**:
   - Visual percentage breakdown
   - Total spending per category
   - Monthly comparison
   - Color-coded categories

## File Structure

```
Evidence Tracker/
├── src/                    # React frontend source
│   ├── App.jsx            # Main application component
│   ├── Overview.jsx       # Monthly overview component
│   ├── main.jsx          # React entry point
│   └── index.css         # Tailwind CSS styles
├── src-tauri/             # Tauri backend
│   ├── src/
│   │   └── main.rs       # Rust backend with database operations
│   ├── tauri.conf.json   # Tauri configuration
│   ├── Cargo.toml        # Rust dependencies
│   └── icons/            # Application icons
├── public/               # Static assets
├── package.json         # Node.js dependencies and scripts
└── README.md           # This file
```

## API Commands

The application uses Tauri's invoke system to communicate between frontend and backend:

- `get_entries(date)` - Retrieve entries for a specific date
- `add_entries(date, entries)` - Add multiple entries for a date
- `lock_day(date)` - Lock a specific day
- `update_entry(id, tag, value)` - Update an existing entry
- `get_months()` - Get all available months with data
- `get_monthly_summary(month)` - Get monthly spending summary
- `get_tag_config()` - Get current tag configuration
- `save_tag_config(config)` - Save tag configuration
- `add_tag(tag, color?)` - Add a new tag
- `remove_tag(tag)` - Remove a tag
- `get_config_path_cmd()` - Get the path to the configuration directory

## Troubleshooting

### Common Issues

1. **Database Not Found**:
   - Check if the config directory exists
   - Restart the application

2. **Tags Not Loading**:
   - Verify `tags.json` file format (must be valid JSON)
   - Check file permissions
   - Delete the file to regenerate defaults
   - Check console for file watching errors

3. **File Watcher Issues**:
   - Ensure the config directory is writable
   - Check if file system notifications are supported
   - Restart the application if file watching stops working

3. **Build Errors**:
   - Ensure Rust is installed and updated
   - Check Tauri prerequisites for your OS
   - Clear node_modules and reinstall dependencies

4. **Development Server Issues**:
   - Check that ports 5173 is available
   - Ensure Node.js version compatibility
   - Try `npm run dev` instead of `tauri dev`

### Logs

- Development logs appear in the terminal
- Production logs are available through the system's logging mechanism
- Database errors are logged to the console

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Dependencies

### Frontend
- React 19.1.0
- Tailwind CSS 4.1.10
- @tauri-apps/api 1.5.0

### Backend
- Tauri 1.5
- SQLite (via rusqlite)
- Serde for JSON serialization
- Chrono for date handling
- Notify for file system watching

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the Tauri documentation
3. Check existing issues in the repository
4. Create a new issue with detailed information

---

**Note**: This application stores all data locally on your device. No data is sent to external servers.