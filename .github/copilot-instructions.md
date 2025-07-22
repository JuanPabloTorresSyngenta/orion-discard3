# Orion Discard WordPress Plugin - AI Coding Instructions

## Project Overview
This is a WordPress plugin scaffolding project named "orion-discard" with a well-structured directory layout but minimal implementation. The main entry point is `orion-discard.php` which contains only basic plugin header information.

## Architecture & Directory Structure

### Core Structure Pattern
```
orion-discard.php     # Main plugin file (entry point)
uninstall.php         # Plugin cleanup on uninstall
readme.txt            # WordPress plugin repository readme
assets/               # Static resources (CSS, JS, images, fonts)
admin/                # WordPress admin interface components
includes/             # Core plugin functionality and utilities
models/               # Data models and database interactions
services/             # Business logic and external integrations
templates/            # Template files for frontend/admin views
languages/            # Internationalization files
tests/                # Unit and integration tests
vendor/               # Composer dependencies
```

## Development Guidelines

### Plugin Entry Point Pattern
- Main functionality should be added to `orion-discard.php` after the existing header
- Follow WordPress plugin standards: use proper hooks, security practices, and coding standards
- Text domain is `orion-discard` for internationalization

### Directory Usage Conventions
- **`admin/`**: WordPress admin dashboard pages, settings, and admin-only functionality
- **`includes/`**: Core classes, helper functions, and plugin initialization logic
- **`models/`**: Database table definitions, data validation, and ORM-like structures
- **`services/`**: API integrations, email services, and complex business logic
- **`templates/`**: PHP template files for rendering frontend and admin views
- **`assets/css/`**: Stylesheets (currently contains empty `style.css`)
- **`assets/js/`**: JavaScript files (currently contains empty `app.js`)
- **`assets/images/`**: Contains `icon-128x128.png` for plugin icon
- **`languages/`**: Translation files (.po, .pot, .mo files)

### WordPress-Specific Patterns
- Use WordPress hooks system (`add_action`, `add_filter`) for plugin integration
- Follow WordPress security practices (nonces, sanitization, capability checks)
- Use WordPress coding standards (spaces, naming conventions)
- Enqueue scripts/styles using `wp_enqueue_script`/`wp_enqueue_style`

### Asset Management
- CSS files should be placed in `assets/css/`
- JavaScript files should be placed in `assets/js/`
- Images and icons go in `assets/images/`
- Custom fonts belong in `assets/fonts/`

### Development Workflow
- Plugin is in early scaffolding stage - most directories are empty and ready for implementation
- Main plugin file needs security checks and proper WordPress initialization
- No build system is currently configured - static assets are served directly
- No testing framework is set up yet

### Key Implementation Points
- Add proper plugin activation/deactivation hooks
- Implement security measures (prevent direct access)
- Set up proper autoloading for classes in `includes/`
- Configure internationalization support
- Add uninstall cleanup logic to `uninstall.php`

### Spanish Language Context
- Plugin description is in Spanish: "Plugin base generado automaticamente"
- Author is "Juan P. Torres"
- Consider bilingual support given the mixed language context

## Functional Requirements (Material Discard System)

### Core Features
- **Shortcode**: `[vform id=353876]` renders the discard form
- **Form Components**:
  - Farm dropdown (populated from Orion API)
  - Section dropdown (filtered by selected farm)
  - Field dropdown (filtered by selected section)
  - Scanner text input (receives barcode data)
  - Submit button
- **DataTables Integration**: Display discarded materials in sortable/searchable table
- **Orion API Integration**: `/wp-json/orion-maps-fields/v1/fields?site=PRSA`

### API Data Structure
- **Farms**: `field_type: "farm"` (id, title)
- **Sections**: `field_type: "sections"` (id, title, farm_name references farm id)
- **Fields**: `field_type: "fields"` (id, title, farm_name, section_name)
- **Hierarchy**: Farm → Section → Field (cascading dropdowns)

### Database Requirements
- Custom table for discard records
- Fields: farm_id, section_id, field_id, scanned_code, timestamp, user_id

## Implementation Priority
1. **Phase 1**: Plugin structure, security, and basic shortcode
2. **Phase 2**: Orion API integration and form rendering
3. **Phase 3**: JavaScript for cascading dropdowns
4. **Phase 4**: Database operations and DataTables display
5. **Phase 5**: Scanner integration and validation
