#!/bin/bash

# BattleMint - Quick Start Setup Script
# This script initializes the entire BattleMint platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js found: $NODE_VERSION"
    else
        print_error "Node.js not found. Please install Node.js 18.19+"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm not found"
        exit 1
    fi
    
    # Check PostgreSQL
    if command -v psql &> /dev/null; then
        print_success "PostgreSQL found"
    else
        print_warning "PostgreSQL not found. Install with: brew install postgresql"
    fi
    
    # Check Redis
    if command -v redis-cli &> /dev/null; then
        print_success "Redis found"
    else
        print_warning "Redis not found. Install with: brew install redis"
    fi
    
    # Check Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "$DOCKER_VERSION"
    else
        print_warning "Docker not found. Install from https://www.docker.com"
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        print_success "Git found"
    else
        print_error "Git not found. Please install Git"
        exit 1
    fi
}

# Setup backend
setup_backend() {
    print_header "Setting Up Backend"
    
    if [ ! -d "backend" ]; then
        print_error "Backend directory not found"
        return 1
    fi
    
    cd backend
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm install
    
    # Create environment file
    if [ ! -f ".env" ]; then
        print_info "Creating .env file..."
        cp .env.example .env
        print_warning "Please update .env with your configuration"
    else
        print_success ".env file already exists"
    fi
    
    # Build TypeScript
    print_info "Building TypeScript..."
    npm run build
    print_success "Backend setup complete"
    
    cd ..
}

# Setup database
setup_database() {
    print_header "Setting Up Database"
    
    # Check if PostgreSQL is running
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL not installed. Skipping database setup."
        return 1
    fi
    
    print_info "Creating database..."
    
    # Create database
    psql -U postgres -c "CREATE DATABASE battlemint;" 2>/dev/null || true
    
    # Create user
    psql -U postgres -c "CREATE USER battlemint_user WITH PASSWORD 'battlemint_password';" 2>/dev/null || true
    
    # Grant privileges
    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE battlemint TO battlemint_user;" 2>/dev/null || true
    
    print_success "Database setup complete"
}

# Setup mobile app
setup_mobile() {
    print_header "Setting Up Mobile App"
    
    if [ ! -d "mobile_app" ]; then
        print_error "Mobile app directory not found"
        return 1
    fi
    
    cd mobile_app
    
    # Check Flutter
    if ! command -v flutter &> /dev/null; then
        print_error "Flutter not found. Install from https://flutter.dev/docs/get-started/install"
        cd ..
        return 1
    fi
    
    # Get dependencies
    print_info "Getting Flutter dependencies..."
    flutter pub get
    
    print_success "Mobile app setup complete"
    print_info "To run: flutter run"
    
    cd ..
}

# Setup admin panel
setup_admin() {
    print_header "Setting Up Admin Panel"
    
    if [ ! -d "admin_panel" ]; then
        print_error "Admin panel directory not found"
        return 1
    fi
    
    cd admin_panel
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm install
    
    print_success "Admin panel setup complete"
    print_info "To run: npm start"
    
    cd ..
}

# Setup Docker
setup_docker() {
    print_header "Setting Up Docker"
    
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not installed. Skipping Docker setup."
        return 1
    fi
    
    if [ ! -f "backend/docker-compose.yml" ]; then
        print_error "docker-compose.yml not found"
        return 1
    fi
    
    cd backend
    
    print_info "Building Docker images..."
    docker-compose build
    
    print_success "Docker setup complete"
    print_info "To start: docker-compose up -d"
    
    cd ..
}

# Summary
print_summary() {
    print_header "Setup Complete!"
    
    echo -e "${GREEN}BattleMint is ready to run!${NC}\n"
    
    echo "Quick Start Commands:"
    echo "===================="
    echo ""
    echo "1. Start Backend:"
    echo "   cd backend && npm run dev"
    echo ""
    echo "2. Start Mobile App:"
    echo "   cd mobile_app && flutter run"
    echo ""
    echo "3. Start Admin Panel:"
    echo "   cd admin_panel && npm start"
    echo ""
    echo "4. Using Docker (All-in-one):"
    echo "   cd backend && docker-compose up -d"
    echo ""
    echo "Next Steps:"
    echo "==========="
    echo "1. Configure database credentials in backend/.env"
    echo "2. Set up AWS S3 bucket for file uploads"
    echo "3. Configure Firebase for push notifications"
    echo "4. Update API URLs in mobile app"
    echo "5. Create admin account in database"
    echo ""
    echo "Documentation:"
    echo "=============="
    echo "- Architecture: BATTLEMINT_ARCHITECTURE.md"
    echo "- Deployment: DEPLOYMENT_GUIDE.md"
    echo "- APK Build: APK_BUILD_GUIDE.md"
    echo ""
    echo -e "${GREEN}Happy coding!${NC}\n"
}

# Main script
main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                  BattleMint Setup Script                   ║"
    echo "║            Esports Tournament Platform v1.0.0              ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Get script directory
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    cd "$SCRIPT_DIR"
    
    # Check prerequisites
    check_prerequisites
    
    # Ask user what to setup
    echo ""
    echo "What would you like to set up?"
    echo "1) Everything (recommended)"
    echo "2) Backend only"
    echo "3) Mobile app only"
    echo "4) Admin panel only"
    echo "5) Docker setup"
    echo ""
    read -p "Enter option (1-5): " OPTION
    
    case $OPTION in
        1)
            setup_backend
            setup_database
            setup_mobile
            setup_admin
            setup_docker
            print_summary
            ;;
        2)
            setup_backend
            setup_database
            ;;
        3)
            setup_mobile
            ;;
        4)
            setup_admin
            ;;
        5)
            setup_docker
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac
}

# Run main script
main "$@"
