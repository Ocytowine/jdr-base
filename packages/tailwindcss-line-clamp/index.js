const plugin = require('tailwindcss/plugin');

module.exports = plugin(
  function ({ matchUtilities, theme }) {
    matchUtilities(
      {
        'line-clamp': (value) => {
          if (value === 'none') {
            return {
              overflow: 'visible',
              display: 'block',
              '-webkit-box-orient': 'horizontal',
              '-webkit-line-clamp': 'unset'
            };
          }

          return {
            overflow: 'hidden',
            display: '-webkit-box',
            '-webkit-box-orient': 'vertical',
            '-webkit-line-clamp': String(value)
          };
        }
      },
      {
        values: {
          none: 'none',
          ...theme('lineClamp')
        },
        supportsNegativeValues: false
      }
    );
  },
  {
    theme: {
      lineClamp: {
        1: '1',
        2: '2',
        3: '3',
        4: '4',
        5: '5',
        6: '6',
        7: '7',
        8: '8',
        9: '9',
        10: '10'
      }
    }
  }
);
