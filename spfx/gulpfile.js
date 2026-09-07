'use strict';

const build = require('@microsoft/sp-build-web');

build.addSuppression(/Warning - \[sass\] The local CSS class/);

/*
 * La interfaz vive en /src (fuera de /spfx) y usa CSS Modules en .module.css,
 * que la cadena de SPFx no procesa por defecto. Aqui se anaden las dos reglas
 * que faltan: .module.css como modulo y el resto de .css como hoja global.
 */
build.configureWebpack.mergeConfig({
  additionalConfiguration: (generatedConfiguration) => {
    generatedConfiguration.module.rules.push(
      {
        test: /\.module\.css$/,
        use: [
          require.resolve('style-loader'),
          {
            loader: require.resolve('css-loader'),
            options: {
              modules: {
                localIdentName: 'pbi_[name]__[local]___[hash:base64:5]',
                exportLocalsConvention: 'camelCaseOnly',
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        exclude: /\.module\.css$/,
        use: [require.resolve('style-loader'), require.resolve('css-loader')],
      },
    );

    return generatedConfiguration;
  },
});

build.initialize(require('gulp'));
