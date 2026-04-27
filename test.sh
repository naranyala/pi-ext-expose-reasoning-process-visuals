#!/bin/bash

# Quick Test Script for Pi Extension Starter
# This script helps you test the hello world extension

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         🚀 Pi Extension Starter - Hello World Test            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if pi is available
if ! command -v pi &> /dev/null; then
    echo "❌ Error: 'pi' command not found"
    echo ""
    echo "Please install pi first: https://pi.mariozechner.dev"
    exit 1
fi

echo "📂 Project Directory: $(pwd)"
echo ""

# Check if src/index.ts exists
if [ ! -f "src/index.ts" ]; then
    echo "❌ Error: src/index.ts not found"
    echo "Please run this script from the pi-ext-starter directory"
    exit 1
fi

echo "✅ Found src/index.ts"
echo ""

echo "🧪 Testing the Hello World Extension..."
echo ""
echo "This will start pi with the extension loaded."
echo "You should see:"
echo "  ✅ 'Hello World! 🎉' notification"
echo "  ✅ 'Sample ext installed! ✨' message"
echo "  ✅ Extension status widget"
echo ""
echo "Try these commands:"
echo "  /hello"
echo "  /hello Alice"
echo "  /ping"
echo ""
echo "Or ask: 'Greet me with a hello world message'"
echo ""
echo "Press Ctrl+C to exit"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run pi with the extension
pi -e ./src/index.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Test complete!"
echo ""
echo "📚 To learn more:"
echo "  • Read: cat HELLO_WORLD.md"
echo "  • Read: cat QUICKSTART.md"
echo "  • Examples: ls examples/"
echo "  • Guides: ls docs/"
echo ""
echo "🎉 Next steps:"
echo "  1. Modify src/index.ts to customize"
echo "  2. Copy to: ~/.pi/agent/extensions/my-ext.ts"
echo "  3. Reload: pi /reload"
echo ""
