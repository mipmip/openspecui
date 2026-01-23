## ADDED Requirements

### Requirement: Static Export Command

The CLI SHALL provide an `export` command that generates a complete static website from OpenSpec project files.

#### Scenario: Basic export with default options
- **GIVEN** a valid OpenSpec project directory
- **WHEN** user runs `openspecui export`
- **THEN** the system SHALL generate static HTML files in `./openspec-export/` directory
- **AND** the output SHALL include all specs, changes, and archive pages
- **AND** the output SHALL be viewable without a running server

#### Scenario: Export with custom output directory
- **GIVEN** a valid OpenSpec project directory
- **WHEN** user runs `openspecui export ./my-docs`
- **THEN** the system SHALL generate static files in `./my-docs/` directory
- **AND** the directory SHALL be created if it does not exist

#### Scenario: Export with custom base path for deployment
- **GIVEN** a valid OpenSpec project directory
- **WHEN** user runs `openspecui export --base-path=/docs/`
- **THEN** the system SHALL configure all asset and navigation paths relative to `/docs/`
- **AND** the exported site SHALL function correctly when served from `/docs/` subdirectory

#### Scenario: Export with clean option
- **GIVEN** an existing output directory with old files
- **WHEN** user runs `openspecui export --clean`
- **THEN** the system SHALL remove all existing files in the output directory before export
- **AND** only newly generated files SHALL be present after export

#### Scenario: Export fails on invalid project
- **GIVEN** a directory without valid OpenSpec structure
- **WHEN** user runs `openspecui export`
- **THEN** the system SHALL display a clear error message
- **AND** exit with non-zero status code
- **AND** NOT create partial output

### Requirement: Static Data Snapshot Generation

The export process SHALL generate a complete data snapshot of the project state at export time.

#### Scenario: Data snapshot includes all project data
- **GIVEN** a project with specs, changes, and archives
- **WHEN** export is executed
- **THEN** the system SHALL generate a `data.json` file
- **AND** the file SHALL contain all specs with their content
- **AND** the file SHALL contain all active changes with their deltas
- **AND** the file SHALL contain all archived changes
- **AND** the file SHALL include dashboard statistics
- **AND** the file SHALL include project metadata (timestamp, version)

#### Scenario: Data snapshot matches runtime API responses
- **GIVEN** a generated data snapshot
- **WHEN** compared to live server tRPC responses
- **THEN** the data structure SHALL be identical
- **AND** all fields SHALL have the same types and values

#### Scenario: Large project data snapshot
- **GIVEN** a project with >100 specifications
- **WHEN** export generates data snapshot
- **THEN** the system SHALL display a warning if snapshot exceeds 10MB
- **AND** the export SHALL complete successfully regardless of size

### Requirement: Multi-Route HTML Generation

The export process SHALL generate separate HTML files for all dynamic routes.

#### Scenario: Generate HTML for all specs
- **GIVEN** a project with multiple specs
- **WHEN** export is executed
- **THEN** the system SHALL create `specs/[spec-id].html` for each spec
- **AND** each HTML file SHALL be directly accessible via URL
- **AND** each file SHALL contain the complete React application

#### Scenario: Generate HTML for all changes
- **GIVEN** a project with active changes
- **WHEN** export is executed
- **THEN** the system SHALL create `changes/[change-id].html` for each change
- **AND** files SHALL include all change details (proposal, tasks, deltas)

#### Scenario: Generate HTML for archived changes
- **GIVEN** a project with archived changes
- **WHEN** export is executed
- **THEN** the system SHALL create `archive/[change-id].html` for each archived change

#### Scenario: Route enumeration failure
- **GIVEN** corrupted spec files that cannot be parsed
- **WHEN** export attempts to enumerate routes
- **THEN** the system SHALL fail with a descriptive error message
- **AND** indicate which files could not be processed

### Requirement: Static Mode Feature Degradation

The web application SHALL detect static export mode and gracefully disable server-dependent features.

#### Scenario: Display static mode indicator
- **GIVEN** the application is running in static export mode
- **WHEN** any page is loaded
- **THEN** the system SHALL display a banner indicating "Static snapshot mode"
- **AND** the banner SHALL include the export timestamp
- **AND** the banner SHALL indicate that live features are disabled

#### Scenario: Disable WebSocket subscriptions
- **GIVEN** the application is running in static export mode
- **WHEN** components attempt to subscribe to real-time updates
- **THEN** the system SHALL use cached snapshot data instead
- **AND** SHALL NOT attempt WebSocket connections
- **AND** SHALL NOT display connection errors

#### Scenario: Disable task toggling
- **GIVEN** a task list displayed in static mode
- **WHEN** user attempts to click checkboxes
- **THEN** checkboxes SHALL be rendered as read-only
- **AND** SHALL display a tooltip explaining static mode limitation

#### Scenario: Disable AI integration features
- **GIVEN** AI features available in live mode
- **WHEN** viewed in static export mode
- **THEN** AI action buttons SHALL be hidden or disabled
- **AND** no API calls SHALL be attempted

### Requirement: Asset Bundling and Deployment

The export process SHALL generate a self-contained static website with all necessary assets.

#### Scenario: Bundle all static assets
- **GIVEN** the web application uses CSS, JavaScript, fonts, and images
- **WHEN** export is executed
- **THEN** all assets SHALL be copied to the output directory
- **AND** all asset references SHALL use correct relative or absolute paths based on base-path configuration

#### Scenario: Support standard static hosting
- **GIVEN** an exported site
- **WHEN** deployed to a static host (GitHub Pages, Netlify, S3)
- **THEN** all pages SHALL be accessible via URL
- **AND** client-side routing SHALL work correctly
- **AND** direct links to specific specs/changes SHALL work

#### Scenario: Generate SPA fallback routing configuration
- **GIVEN** the export includes dynamic routes
- **WHEN** export is executed
- **THEN** the system SHALL generate appropriate fallback configuration files
- **AND** SHALL include `_redirects` for Netlify
- **AND** SHALL include `404.html` for GitHub Pages SPA fallback

### Requirement: Export Progress and Feedback

The CLI SHALL provide clear feedback during the export process.

#### Scenario: Display export progress
- **GIVEN** an export is in progress
- **WHEN** processing stages complete
- **THEN** the system SHALL display progress messages:
  - "Scanning project..."
  - "Generating data snapshot..."
  - "Building static assets..."
  - "Generating route HTML files..."
  - "Export complete"
- **AND** SHALL display the output directory path
- **AND** SHALL display the total number of pages generated

#### Scenario: Display timing information
- **GIVEN** an export completes successfully
- **WHEN** displaying completion message
- **THEN** the system SHALL show total export time
- **AND** SHALL show output directory size

#### Scenario: Error reporting during export
- **GIVEN** an error occurs during any export stage
- **WHEN** the error is encountered
- **THEN** the system SHALL display which stage failed
- **AND** SHALL provide actionable error message
- **AND** SHALL clean up partial output (unless --keep-partial flag is set)

### Requirement: CI/CD Integration Support

The export command SHALL support automation and continuous integration workflows.

#### Scenario: Non-interactive mode
- **GIVEN** export is run in CI environment
- **WHEN** `openspecui export --no-open` is used
- **THEN** the system SHALL NOT attempt to open a browser
- **AND** SHALL complete without requiring user input

#### Scenario: Deterministic output for caching
- **GIVEN** the same project state
- **WHEN** export is run multiple times
- **THEN** generated files SHALL have consistent content
- **AND** timestamps in metadata SHALL be excluded from content hashes where appropriate
- **AND** CI build caching SHALL be effective

#### Scenario: Exit codes for automation
- **GIVEN** export command execution
- **WHEN** export succeeds
- **THEN** the system SHALL exit with code 0
- **WHEN** export fails due to validation errors
- **THEN** the system SHALL exit with code 1
- **WHEN** export fails due to system errors (disk full, permissions)
- **THEN** the system SHALL exit with code 2
