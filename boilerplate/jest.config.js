module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        "node_modules/@affidaty/trinci-sdk-as/.+\\.(j|t)sx?$": "ts-jest"
    },
    transformIgnorePatterns: [
        "node_modules/(?!@affidaty/trinci-sdk-as/.*)"
    ]
};