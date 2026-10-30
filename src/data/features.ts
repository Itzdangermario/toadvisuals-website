/**
 * Feature descriptions for the website, written from the mod's README.
 * `image` (optional): a screenshot in public/screenshots/, e.g. '/screenshots/kill-effects.png'.
 */
export interface Feature {
  id: string;
  title: string;
  text: string;
  points?: string[];
  icon: string;
  image?: string;
}

export interface FeatureGroup {
  id: string;
  title: string;
  intro: string;
  items: Feature[];
}

export const featureGroups: FeatureGroup[] = [
  {
    id: 'pvp',
    title: 'Your PvP setup',
    intro:
      'The PVP tab puts every texture you care about into one place. Pick a style from any resource pack you own and Toad’s Visuals builds one pack out of all your choices.',
    items: [
      {
        id: 'texture-mixing',
        title: 'Mix textures from every pack',
        icon: 'layers',
        text: 'Each collection shows one card per pack with a live 3D preview. Click a card to use it, click it again to go back to vanilla, right-click to only look at it. A turntable preview lets you turn and zoom the model.',
        points: [
          'Modes for Crystal PvP, Netherite Pot, Mace, Sword, Axe, Cart, Diamond Crystal and Spear PvP',
          'Separate picks for diamond and netherite tools and armor',
          'Weapons and armor, HUD and screen, blocks and world, items and tools',
          'Single textures: pick any texture from any pack',
        ],
      },
      {
        id: 'apply',
        title: 'One generated pack, applied safely',
        icon: 'save',
        text: 'Your choices are written into one resource pack (Toad’s Visuals Generated) when you close the menu or press APPLY. A failed reload is rolled back, and the pack is checked and rebuilt at every game start if it is missing or outdated.',
      },
      {
        id: 'filters',
        title: 'Find the right style fast',
        icon: 'eye',
        text: 'Filter by all packs, your own, preinstalled or favorites, sort A–Z or by date, and search through every section at once. Each tile shows the style you use right now.',
      },
    ],
  },
  {
    id: 'extras',
    title: 'Extras',
    intro: 'Everything in the EXTRAS tab happens only on your screen. Nothing is sent to the server.',
    items: [
      {
        id: 'kill-effects',
        title: 'Kill effects and item animations',
        icon: 'spark',
        text: 'Eighteen effects for your kills (or every death near you), each with size, colour or rainbow, sound and volume. An item can rise where the player died: it glows, spins, floats up and breaks into pieces.',
      },
      {
        id: 'sounds',
        title: 'Kill sounds, hit sounds and a sound editor',
        icon: 'sound',
        text: '26 kill sounds and 18 hit sounds made from Minecraft’s own sounds, or your own .ogg or .wav file. Kill, hit, shield break and totem pop sounds are all in one sound editor with preview and volume.',
      },
      {
        id: 'cpvp',
        title: 'CPvP essentials',
        icon: 'target',
        text: 'Fullbright from 10 to 100 %, an invisible shield in first person, no totem pop or crystal sounds, smaller shield, golden apples and totem, a smaller totem pop animation, no pumpkin overlay and no hurt camera shake.',
      },
      {
        id: 'crosshair',
        title: 'Crosshair editor',
        icon: 'target',
        text: 'Cross, cross with dot, dot, circle, circle with dot, T, X or square, with gap, length, thickness, colour, opacity and a black outline. Minecraft’s attack indicator can stay under it.',
      },
      {
        id: 'hud',
        title: 'PvP HUD and armor HUD',
        icon: 'hud',
        text: 'Count up to 12 items plus healing, strength, speed and fire resistance potions, with presets for every PvP mode. The armor HUD shows durability in percent, as a bar or as icons. Drag both anywhere while the chat is open.',
      },
      {
        id: 'opacity-glint',
        title: 'Opacity editor and glint styles',
        icon: 'palette',
        text: 'Make fire, water, the pumpkin overlay, totems, swords, the hotbar and more see-through from 0 to 100 %. Give the enchantment glint a colour, rainbow, waves or sparkle.',
      },
      {
        id: 'outline-hitcolour',
        title: 'Block outline and hit colour',
        icon: 'sun',
        text: 'Your own block outline colour or rainbow, thickness and a see-through fill. Players and mobs can flash in your colour instead of red when they get hurt.',
      },
      {
        id: 'hide-armor',
        title: 'Hide armor',
        icon: 'eye',
        text: 'Make your own armor, other players’ armor and mobs’ armor see-through, each with its own opacity.',
      },
      {
        id: 'sky',
        title: 'Sky editor',
        icon: 'sun',
        text: 'Premade skies, skies found in your packs, or your own picture, with time of day, glow and opacity. Needs the Skyboxify mod to show in game.',
      },
      {
        id: 'markers-particles',
        title: 'Item markers and particles',
        icon: 'spark',
        text: 'Small icons or coloured frames show Breach, Density and Wind Burst maces and protection enchantments on your own items. Hide explosions, smoke, crits, sweeps, totem particles and more.',
      },
      {
        id: 'cosmetics',
        title: 'Player logo, capes and nick',
        icon: 'cape',
        text: 'The Toad’s Visuals logo in front of your name, seen by other players of the mod. Your own cape images or the cape generator, and a nick with another player’s skin. Capes and nick are only on your screen.',
      },
    ],
  },
  {
    id: 'look',
    title: 'Look and comfort',
    intro: 'The menu is yours too.',
    items: [
      {
        id: 'themes',
        title: 'Themes, fonts and colours',
        icon: 'palette',
        text: 'Six looks (Toad, Minecraft, Classic, Modern, Glass, Flat), six fonts, your own text and accent colour, a background image and a window size from 40 % to full screen.',
      },
      {
        id: 'presets',
        title: 'Presets and share codes',
        icon: 'save',
        text: 'Save complete setups, load one at game start, and share it as a code or JSON file.',
      },
      {
        id: 'performance',
        title: 'Light on your game',
        icon: 'layers',
        text: 'Only the textures the collections use are read, only the card under the mouse animates, and previews are freed when the menu closes.',
      },
      {
        id: 'languages',
        title: 'English and German',
        icon: 'book',
        text: 'The whole menu, the tutorial and the changelog are in English and German.',
      },
    ],
  },
];

/** The kill effects of the mod (KillEffects.java). */
export const killEffects: { name: string; text: string }[] = [
  { name: 'Lightning', text: 'A lightning strike with thunder' },
  { name: 'Gravestone', text: 'A little gravestone with the player’s name' },
  { name: 'Smoke', text: 'A thick column of smoke' },
  { name: 'Firework', text: 'A firework burst in your colour' },
  { name: 'Totem', text: 'Green and gold pieces spiral up' },
  { name: 'Souls', text: 'Souls rising into the sky' },
  { name: 'Red burst', text: 'A splash of red' },
  { name: 'Hearts', text: 'A ring of hearts' },
  { name: 'Explosion', text: 'A big, harmless explosion' },
  { name: 'Flame spiral', text: 'A spiral of fire' },
  { name: 'Ender', text: 'Vanishes like an enderman' },
  { name: 'Confetti', text: 'Colourful confetti' },
  { name: 'Shockwave', text: 'An expanding ring in your colour' },
  { name: 'Sonic boom', text: 'The warden’s sonic boom' },
  { name: 'Helix', text: 'Two spirals rising around the spot' },
  { name: 'Light pillar', text: 'A beam of light shoots into the sky' },
  { name: 'Crystal pop', text: 'A harmless end crystal flash with sparks' },
  { name: 'Wind burst', text: 'A breeze’s gust blows outwards' },
];

export const pvpModes = ['Crystal PvP', 'Netherite Pot', 'Mace PvP', 'Sword PvP', 'Axe PvP', 'Cart PvP', 'Diamond Crystal', 'Spear PvP'];
