// const slsw = require('serverless-webpack');
const webpack = require('webpack');
const path = require('path');

module.exports = {
    // entry: slsw.lib.entries,
    entry: {
        worker: path.join(__dirname, "src/worker.ts")
    },
    output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].bundle.js"
    },
    optimization: {
        minimize: false
    },
    target: 'node',
    // mode: slsw.lib.webpack.isLocal ? "development" : "production",
    mode: "production",
    module: {
        rules: [
            {
                test: [/\.tsx?$/],
                exclude: [/node_modules/, /\.test.tsx?$/],
                use:
                    [
                        {
                            'loader': 'ts-loader'
                        }
                    ]
            }
        ]
    },
    plugins: [
        new webpack.IgnorePlugin(/^pg-native$/)
    ],
    resolve: {
        modules: ['node_modules', 'scripts'],
        extensions: ['.ts', '.tsx', '.json', '.js', '.jsx']
    },
};