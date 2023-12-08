module.exports = {
  packagerConfig: {
    icon: 'src/assets/icons/icon',
    ignore: [
      '^/.angular$',
      '^/.vscode$',
      '^/node_modules$',
      '^/(angular|proxy.conf|tsconfig|tsconfig.app|tsconfig.spec).json$',
      '^/forge.config.js$',
      '^/README.md$',
      '^/src$'
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
};
