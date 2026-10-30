/**
 * NeonLyrics V3 - Typography Presets & Font Registry
 * Defines curated font categories, pairing presets, and font pairing configurations.
 */

const FONT_CATEGORIES = {
  modern: {
    label: 'Modern Sans',
    fonts: ['Outfit', 'Inter', 'Manrope', 'Poppins', 'DM Sans', 'Plus Jakarta Sans', 'Montserrat']
  },
  cinematic: {
    label: 'Cinematic / Editorial',
    fonts: ['Playfair Display', 'Cormorant Garamond', 'Bodoni Moda', 'Libre Baskerville', 'Lora']
  },
  futuristic: {
    label: 'Futuristic / Tech',
    fonts: ['Orbitron', 'Space Grotesk', 'Rajdhani', 'Oxanium', 'Audiowide', 'Exo 2']
  },
  bold: {
    label: 'Bold / Display',
    fonts: ['Bebas Neue', 'Anton', 'Oswald', 'Archivo Black', 'Barlow Condensed']
  },
  calligraphy: {
    label: 'Calligraphy / Script',
    fonts: [
      'Great Vibes', 'Allura', 'Alex Brush', 'Parisienne', 'Italianno',
      'Qwitcher Grypen', 'Pinyon Script', 'Tangerine', 'Monsieur La Doulaise',
      'Petit Formal Script', 'Rouge Script', 'Rochester', 'Mr De Haviland', 'Borel'
    ]
  },
  handwritten: {
    label: 'Handwritten / Casual',
    fonts: ['Dancing Script', 'Sacramento', 'Caveat', 'Satisfy', 'Pacifico']
  }
};

const TYPOGRAPHY_PAIRING_PRESETS = [
  {
    id: 'modern-clean',
    name: 'Modern Clean',
    description: 'Crisp contemporary aesthetic with Outfit and Inter',
    config: {
      fontFamily: 'Outfit',
      activeLineFont: 'Outfit',
      prevLineFont: 'Inter',
      nextLineFont: 'Inter',
      activeWordFont: 'Outfit',
      sungWordFont: 'Inter',
      upcomingWordFont: 'Inter',
      letterSpacing: '0px',
      lineHeight: 1.4,
      fontWeight: '700'
    }
  },
  {
    id: 'cinematic-romance',
    name: 'Cinematic Romance',
    description: 'Poetic serif lyrics with Playfair Display & Great Vibes',
    config: {
      fontFamily: 'Playfair Display',
      activeLineFont: 'Playfair Display',
      prevLineFont: 'Cormorant Garamond',
      nextLineFont: 'Cormorant Garamond',
      activeWordFont: 'Playfair Display',
      sungWordFont: 'Great Vibes',
      upcomingWordFont: 'Playfair Display',
      letterSpacing: '0.5px',
      lineHeight: 1.5,
      fontWeight: '600'
    }
  },
  {
    id: 'cyber-futurism',
    name: 'Cyber Futurism',
    description: 'High-tech neon display with Orbitron and Space Grotesk',
    config: {
      fontFamily: 'Orbitron',
      activeLineFont: 'Orbitron',
      prevLineFont: 'Space Grotesk',
      nextLineFont: 'Space Grotesk',
      activeWordFont: 'Orbitron',
      sungWordFont: 'Space Grotesk',
      upcomingWordFont: 'Space Grotesk',
      letterSpacing: '1px',
      lineHeight: 1.35,
      fontWeight: '800'
    }
  },
  {
    id: 'bold-impact',
    name: 'Bold Impact',
    description: 'Punchy stadium karaoke typography with Bebas Neue and Montserrat',
    config: {
      fontFamily: 'Bebas Neue',
      activeLineFont: 'Bebas Neue',
      prevLineFont: 'Montserrat',
      nextLineFont: 'Montserrat',
      activeWordFont: 'Bebas Neue',
      sungWordFont: 'Montserrat',
      upcomingWordFont: 'Montserrat',
      letterSpacing: '1.5px',
      lineHeight: 1.25,
      fontWeight: '900'
    }
  },
  {
    id: 'acoustic-indie',
    name: 'Acoustic Indie',
    description: 'Intimate handwritten feel with Caveat and Poppins',
    config: {
      fontFamily: 'Caveat',
      activeLineFont: 'Caveat',
      prevLineFont: 'Poppins',
      nextLineFont: 'Poppins',
      activeWordFont: 'Caveat',
      sungWordFont: 'Caveat',
      upcomingWordFont: 'Poppins',
      letterSpacing: '0.2px',
      lineHeight: 1.45,
      fontWeight: '500'
    }
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FONT_CATEGORIES,
    TYPOGRAPHY_PAIRING_PRESETS
  };
}
if (typeof window !== 'undefined') {
  window.FONT_CATEGORIES = FONT_CATEGORIES;
  window.TYPOGRAPHY_PAIRING_PRESETS = TYPOGRAPHY_PAIRING_PRESETS;
}

