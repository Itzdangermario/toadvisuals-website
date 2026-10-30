/**
 * Everything you may want to change in one place.
 * Empty links ("") are not shown on the website.
 */
export const site = {
  name: "Toad's Visuals",
  url: 'https://toadvisuals.lol',
  domain: 'toadvisuals.lol',
  description:
    "Toad's Visuals is a client-side Fabric mod for Minecraft PvP: mix textures from all your resource packs, add kill effects, sounds, a custom crosshair and more, in one menu.",
  authors: ['Itzdangermario', 'tarye'],
  links: {
    discord: 'https://discord.gg/mariomods',
    /** Your GitHub repository, e.g. https://github.com/NAME/toads-visuals */
    github: '',
    /** Your Modrinth project page, if the mod is listed there. */
    modrinth: '',
    skyboxify: 'https://modrinth.com/mod/skyboxify',
    fabricInstaller: 'https://fabricmc.net/use/installer/',
    fabricApi: 'https://modrinth.com/mod/fabric-api',
    modMenu: 'https://modrinth.com/mod/modmenu',
  },
  /**
   * Live numbers on the website (players online, downloads). These are the PUBLIC values the mod already uses
   * (Supabase URL + publishable key); never put a secret key here. Leave url empty to hide the numbers.
   */
  stats: {
    url: 'https://aumaenoaqokcjtxfiumd.supabase.co',
    key: 'sb_publishable_B3vOmvMEv2B7D5G67NhW7A_UnuUKaJc',
  },
  /** The next update shown with a countdown. Time with offset: +01:00 = German winter time (CET), +02:00 = summer time (CEST). */
  nextUpdate: {
    at: '2026-11-07T18:00:00+01:00',
    title: 'Next update',
    text: 'The next version of Toad’s Visuals comes out on this date.',
  },
  /** Real screenshots for the gallery: put PNG/JPG/WebP files into public/screenshots/ and list them here. */
  screenshots: [] as { src: string; alt: string; caption?: string }[],
};

/**
 * Imprint and privacy contact. Everything here is published on the website, so it is EMPTY on purpose:
 * no private name, address, email or phone number is shown unless you fill it in yourself.
 *
 * Note (not legal advice): German law (§ 5 DDG) can require a name and an address that can receive mail in the
 * imprint of a public website. If that applies to you, you do not have to use your home address: an imprint /
 * c/o address service gives you an address to publish instead. Empty fields are simply not shown.
 */
export const legal = {
  /** Name or project operator as it may be published, e.g. a c/o service name. */
  name: '',
  /** Postal address lines that may be published (e.g. of a c/o address service). */
  address: [] as string[],
  /** A public contact email (e.g. a project address, not your private one). */
  email: '',
  /** Optional. */
  phone: '',
  /** Date of the last change of the privacy policy. */
  privacyUpdated: '2026-10-30',
};
