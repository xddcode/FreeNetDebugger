import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

/** Flat control surface — input/select/number share the same look (no inset shadow). */
const controlSurface = {
  bg: 'bg.input',
  borderWidth: '1px',
  borderColor: 'border',
  color: 'fg',
  fontFamily: 'mono',
  borderRadius: 'md',
  boxShadow: 'none',
  _hover: {
    borderColor: 'border.emphasized',
  },
  focusVisibleRing: 'outside' as const,
  focusRingWidth: '1px',
  _focusVisible: {
    borderColor: 'colorPalette.solid',
    boxShadow: '0 0 0 1px {colors.border.focus}',
  },
};

const config = defineConfig({
  conditions: {
    dark: '[data-theme=dark] &',
    light: '[data-theme=light] &',
  },
  theme: {
    tokens: {
      fonts: {
        body: {
          value:
            "'Geist', 'PingFang SC', 'Microsoft YaHei UI', 'Segoe UI', sans-serif",
        },
        heading: {
          value:
            "'Geist', 'PingFang SC', 'Microsoft YaHei UI', 'Segoe UI', sans-serif",
        },
        mono: {
          value:
            "'JetBrains Mono', 'Geist Mono', 'Cascadia Mono', 'Consolas', 'PingFang SC', 'Microsoft YaHei UI', monospace",
        },
      },
      fontSizes: {
        '2xs': { value: '11px' },
        xs: { value: '11px' },
        sm: { value: '12px' },
        md: { value: '12px' },
        lg: { value: '13px' },
        xl: { value: '13px' },
        '2xl': { value: '13px' },
        '3xl': { value: '13px' },
      },
      lineHeights: {
        label: { value: '1' },
        tight: { value: '1.25' },
        title: { value: '1.4' },
        snug: { value: '1.35' },
        code: { value: '1.5' },
        normal: { value: '1.5' },
        body: { value: '1.6' },
      },
      letterSpacings: {
        label: { value: '0.05em' },
        display: { value: '-0.02em' },
      },
      radii: {
        sm: { value: '0.125rem' },
        md: { value: '0.25rem' },
        lg: { value: '0.5rem' },
        xl: { value: '0.75rem' },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          value: { _light: '#f5f6fa', _dark: '#111317' },
        },
        'bg.panel': {
          value: { _light: '#ffffff', _dark: '#1a1c20' },
        },
        'bg.subtle': {
          value: { _light: '#f0f1f5', _dark: '#1e2024' },
        },
        'bg.muted': {
          value: { _light: '#e8eaef', _dark: '#282a2e' },
        },
        'bg.emphasized': {
          value: { _light: '#e2e4ea', _dark: '#333539' },
        },
        /** Filled control surface — stands out on `bg.panel` cards (see design mockup). */
        'bg.input': {
          value: { _light: '#e8eaef', _dark: '#282a2e' },
        },
        fg: {
          value: { _light: '#1a1c20', _dark: '#e2e2e8' },
        },
        'fg.muted': {
          value: { _light: '#4a4d55', _dark: '#c1c6d7' },
        },
        'fg.subtle': {
          value: { _light: '#8b90a0', _dark: '#9aa3b5' },
        },
        border: {
          value: { _light: 'rgba(100, 116, 139, 0.2)', _dark: 'rgba(255, 255, 255, 0.05)' },
        },
        'border.emphasized': {
          value: { _light: 'rgba(100, 116, 139, 0.35)', _dark: 'rgba(139, 144, 160, 0.15)' },
        },
        accent: {
          value: { _light: '#005bc1', _dark: '#adc6ff' },
        },
        'accent.emphasized': {
          value: { _light: '#004a9e', _dark: '#8ab4ff' },
        },
        'accent.fg': {
          value: { _light: '#ffffff', _dark: '#002e69' },
        },
        'accent.subtle': {
          value: { _light: 'rgba(0, 91, 193, 0.1)', _dark: 'rgba(173, 198, 255, 0.1)' },
        },
        'border.focus': {
          value: { _light: 'rgba(0, 91, 193, 0.35)', _dark: 'rgba(173, 198, 255, 0.35)' },
        },
        blue: {
          solid: { value: '{colors.accent}' },
          focusRing: { value: '{colors.accent}' },
          border: { value: '{colors.accent}' },
        },
        success: {
          value: { _light: '#006b4f', _dark: '#4edea3' },
        },
        'success.subtle': {
          value: { _light: 'rgba(0, 107, 79, 0.1)', _dark: 'rgba(78, 222, 163, 0.1)' },
        },
        warning: {
          value: { _light: '#8c5a00', _dark: '#ffb95f' },
        },
        'warning.subtle': {
          value: { _light: 'rgba(140, 90, 0, 0.1)', _dark: 'rgba(255, 185, 95, 0.1)' },
        },
        danger: {
          value: { _light: '#93000a', _dark: '#ffb4ab' },
        },
        'danger.subtle': {
          value: { _light: 'rgba(147, 0, 10, 0.08)', _dark: 'rgba(255, 180, 171, 0.08)' },
        },
      },
    },
    recipes: {
      button: {
        base: {
          fontWeight: 'normal',
          borderRadius: 'md',
        },
      },
      input: {
        base: {
          colorPalette: 'blue',
          fontSize: 'sm',
          ...controlSurface,
        },
      },
      textarea: {
        base: {
          colorPalette: 'blue',
          fontSize: 'sm',
          ...controlSurface,
        },
      },
      select: {
        base: {
          borderRadius: 'md',
        },
        variants: {
          outline: {
            trigger: {
              colorPalette: 'blue',
              fontSize: 'sm',
              ...controlSurface,
            },
            content: {
              bg: 'bg.panel',
              borderColor: 'border',
            },
          },
        },
      },
    },
    slotRecipes: {
      numberInput: {
        slots: [
          'root',
          'control',
          'label',
          'valueText',
          'input',
          'incrementTrigger',
          'decrementTrigger',
          'scrubber',
        ],
        base: {
          input: {
            colorPalette: 'blue',
            fontSize: 'sm',
            ...controlSurface,
          },
          control: {
            bg: 'bg.input',
            borderWidth: '1px',
            borderColor: 'border',
            borderRadius: 'md',
            boxShadow: 'none',
          },
          incrementTrigger: {
            color: 'fg.subtle',
            bg: 'transparent',
            borderColor: 'border',
            _hover: { bg: 'bg.emphasized' },
            _active: { bg: 'bg.muted' },
          },
          decrementTrigger: {
            color: 'fg.subtle',
            bg: 'transparent',
            borderColor: 'border',
            _hover: { bg: 'bg.emphasized' },
            _active: { bg: 'bg.muted' },
          },
        },
        variants: {
          variant: {
            outline: {
              input: {
                bg: 'bg.input',
                borderColor: 'border',
              },
            },
            subtle: {
              input: {
                bg: 'bg.input',
                borderColor: 'border',
              },
            },
          },
        },
      },
    },
  },
  globalCss: {
    'html, body, #root': {
      height: '100%',
      fontSize: 'sm',
      lineHeight: 'normal',
      fontFamily: 'body',
    },
    'button, [role="button"]': {
      fontSize: 'sm',
      fontFamily: 'mono',
    },
    '[data-scope="tabs"] [data-part="trigger"]': {
      fontSize: '2xs',
      fontFamily: 'mono',
      letterSpacing: 'label',
    },
    '[data-scope="tabs"] [data-part="content"]': {
      fontSize: 'sm',
    },
    '.chakra-input, .chakra-textarea': {
      colorPalette: 'blue',
      bg: 'bg.input !important',
      boxShadow: 'none !important',
    },
    '.chakra-input[data-variant=outline], .chakra-textarea[data-variant=outline], .chakra-input[data-variant=subtle], .chakra-textarea[data-variant=subtle]':
      {
        bg: 'bg.input',
        boxShadow: 'none',
      },
    '[data-scope="number-input"] [data-part="input"]': {
      colorPalette: 'blue',
      bg: 'bg.input',
      borderColor: 'border',
      color: 'fg',
      boxShadow: 'none',
    },
    '[data-scope="number-input"] [data-part="control"]': {
      boxShadow: 'none',
    },
    '[data-scope="select"] [data-part="trigger"]': {
      boxShadow: 'none',
    },
    'h1, h2, h3, h4, h5, h6': {
      fontWeight: 'normal',
    },
    '[data-scope="checkbox"] [data-part="label"]': {
      fontWeight: 'normal',
    },
    '[data-scope="radio-group"] [data-part="item-text"]': {
      fontWeight: 'normal',
    },
    '[data-scope="select"] [data-part="value-text"]': {
      fontWeight: 'normal',
    },
  },
});

export const system = createSystem(defaultConfig, config);
