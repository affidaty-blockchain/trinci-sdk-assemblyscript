# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [2.3.6] - 2022-03-14

### Added

- sdk.Return namespace containing some helper functions for easy creation of various smart contract responces.
- sdk.Response namespace with some smart contract responces management functions.
- Functions for (de)serialization of various primitives(and their arrays) added to MsgPack namespace.
- loadDataT<>(), storeDataT<>(), loadAssetT<>(), storeAssetT<>() added to HostFunctions namespace

## [2.3.2] - 2022-02-28

### Added

- publish utility.

## [2.3.1] - 2022-02-18

### Added

- arrayBufferToHexString() utility function.

## [2.3.0] - 2022-02-18

### Added

- drand() host function.
- getAccountContract() host function.

## [2.2.1] - 2022-01-13

### Changed

- Changed sdk import in boilerplate code.

## [2.2.0] - 2021-12-02

### Added

- Added HostFunctions.getKeys().
- Added HostFunctions.emit().

## [2.1.2] - 2021-11-25

### Changed

- License changed.

### Added

- License, changelog and readme files added to npm package.

## [2.1.1] - 2021-11-22

### Added

- Added default export along single components exports.

## [2.1.0] - 2021-11-17

### Added

- Added HostFunctions.sha256() function.

## [2.0.5] - 2021-11-10

### Fixed

- MsgPack.appOutputEncode() first arg type changed to bool instead of 'boolean'.

## [2.0.4] - 2021-11-03

### Fixed

- msgpack.ts parentheses fix.

## [2.0.3] - 2021-11-02

### Fixed

- public key serialization fix.

## [2.0.2] - 2021-11-02

### Fixed

- boilerplate dependencies fixed.

## [2.0.1] - 2021-10-29

### Changed

- my_alloc() function renamed to alloc() as expected by trinci-core v0.2.1.

## [2.0.0] - 2021-10-21

### Changed

- HostFunctions.call() now returns a named structure (Types.AppOutput) instead of raw bytes.