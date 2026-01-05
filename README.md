# Baseball Situation Simulator

An interactive web application designed to help baseball coaches teach and players learn proper positioning for various game situations. This tool provides visual field representations, detailed player instructions, and AI-powered scenario generation for all age and skill levels.

## Features

### 🎯 Preloaded Situations
- **Comprehensive Library**: Over 20 preloaded situations covering:
  - Bunt defense (various runner configurations)
  - Fly ball situations (deep outfield, pop-ups)
  - Ground ball plays (double play scenarios)
  - First and third situations
  - Rundown plays
  - Cutoff and relay positions
  - Specialty plays (squeeze defense, etc.)

- **Age-Specific Content**: Situations tailored for:
  - T-Ball through 18U
  - High School
  - Travel Ball

- **Skill Level Customization**:
  - Beginner
  - Intermediate
  - Advanced

### 🤖 AI Scenario Generator
- Describe any game situation in plain English
- AI analyzes the scenario and generates appropriate player positions
- Considers organization rules (Little League, USSSA, NFHS, Travel Ball)
- Adapts to age and skill level

### 📚 Searchable Rules Handbook
- Comprehensive baseball rules database
- Search by keyword, organization, or category
- Rules filtered by age level
- Covers:
  - Little League rules
  - USSSA regulations
  - NFHS (High School) rules
  - Travel ball guidelines
  - General baseball rules

### ⚾ Interactive Field Visualization
- Visual representation of baseball field
- Player positions shown as circles with position labels
- Base runner indicators
- Click on positions to highlight and view detailed instructions
- Color-coded for easy identification

### 📋 Detailed Player Instructions
- Position-specific responsibilities for each situation
- Click any position to see detailed instructions
- Visual highlighting on the field
- Coach's tips and best practices

### 🎮 Simulation Mode
- Run simulation to see all players move to correct positions
- Review before practicing on-field
- Use at home for players to study positioning
- Practice tool for coaches during training sessions

## Installation

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd Claude
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:5173
```

## Usage

### For Coaches

1. **Select Age and Skill Level**: Use the dropdown menus at the top to match your team
2. **Choose a Situation**:
   - Browse preloaded situations in the "Situations" tab
   - Or use the "AI" tab to describe a custom scenario
3. **Review Positioning**:
   - Study the field visualization
   - Click each position to see detailed instructions
4. **Simulate**: Click "Simulate Situation" to see the complete setup
5. **Practice**: Use on-field during practice or show players for at-home study

### For Players

1. **Study at Home**: Review situations assigned by your coach
2. **Learn Positions**: Click on your position to see what you should do
3. **Visualize**: See where you need to be on the field
4. **Practice**: Use during team practice to reinforce learning

### Using the Rules Handbook

1. Click the "Rules" tab
2. Use the search bar to find specific rules
3. Filter by organization or category
4. Click any rule to expand and read the full description
5. Reference during games when rule questions arise

## Features by Tab

### Situations Tab
- Browse all preloaded game situations
- Filter by category (bunt, fly-ball, ground-ball, etc.)
- Shows number of outs and base runners
- Click to load situation onto the field

### AI Generator Tab
- Text area to describe any scenario
- Select organization/rulebook
- AI generates appropriate positioning
- Example scenarios:
  - "Runner on first, 1 out, ground ball to shortstop"
  - "Bases loaded, fly ball to right field"
  - "Bunt defense with runner on third"

### Rules Tab
- Search rules by keyword
- Filter by organization (Little League, USSSA, NFHS, etc.)
- Filter by category (Base Running, Pitching, etc.)
- Age-level appropriate rules
- Expandable rule cards with full descriptions

### Info Tab
- About the application
- How to use guide
- Features overview
- Tips for coaches

## Development

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

### Project Structure

```
Claude/
├── src/
│   ├── components/          # React components
│   │   ├── BaseballField.tsx       # Field visualization
│   │   ├── SituationSelector.tsx   # Situation browser
│   │   ├── AIScenarioGenerator.tsx # AI scenario creator
│   │   ├── RulesHandbook.tsx       # Rules database UI
│   │   └── PlayerInstructions.tsx  # Instruction panel
│   ├── data/                # Data files
│   │   ├── situations.ts    # Preloaded situations
│   │   └── rules.ts         # Rules database
│   ├── types.ts             # TypeScript types
│   ├── App.tsx              # Main application
│   ├── main.tsx             # Entry point
│   └── index.css            # Styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Technologies Used

- **React**: UI framework
- **TypeScript**: Type safety and better developer experience
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **SVG**: Field visualization graphics

## Customization

### Adding New Situations

Edit `src/data/situations.ts` and add new `GameSituation` objects:

```typescript
{
  id: 'unique-id',
  name: 'Situation Name',
  description: 'Detailed description',
  outs: 1,
  runners: { first: true, second: false, third: false },
  playType: 'ground-ball',
  ageLevel: ['12u', '14u'],
  skillLevel: ['intermediate', 'advanced'],
  positions: {
    P: { x: 50, y: 55, instruction: 'What pitcher should do' },
    // ... other positions
  }
}
```

### Adding New Rules

Edit `src/data/rules.ts` and add new `Rule` objects:

```typescript
{
  id: 'unique-id',
  organization: 'Little League',
  category: 'Base Running',
  title: 'Rule Title',
  content: 'Full rule description...',
  ageLevel: ['12u', '14u', '16u']
}
```

## Educational Philosophy

This tool is designed with the following principles:

1. **Visual Learning**: Players learn better when they can see where they should be
2. **Repetition**: Review situations multiple times at home and on-field
3. **Age-Appropriate**: Content matched to player development level
4. **Coach Support**: Gives coaches tools to teach effectively
5. **Rules Knowledge**: Players and coaches can quickly reference rules

## Use Cases

### Pre-Practice Preparation
- Coaches review situations before practice
- Plan which scenarios to work on
- Print or share situations with assistant coaches

### On-Field Training
- Display on tablet or phone during practice
- Players see where to go for each situation
- Quick reference during drills

### At-Home Study
- Players review positions they'll learn
- Parents can help players prepare
- Visual reinforcement between practices

### Game Preparation
- Review common situations before games
- Quick rule lookups during games
- Tournament-specific rule reference

### Post-Game Review
- Discuss situations that occurred in game
- Learn from mistakes
- Reinforce correct positioning

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

Works on desktop, tablet, and mobile devices.

## Contributing

Suggestions for new situations, rules, or features are welcome! This tool is designed to grow with input from coaches and players.

## License

This project is open source and available for educational use.

## Support

For questions, suggestions, or issues, please open an issue in the GitHub repository.

---

**Built for coaches and players who want to learn the game the right way.**
