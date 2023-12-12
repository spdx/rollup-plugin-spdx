'use strict';

var spdxLib = require('@spdx/tools');
var path = require('path');
var sha1File = require('sha1-file');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var spdxLib__namespace = /*#__PURE__*/_interopNamespaceDefault(spdxLib);
var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);

// SPDX-FileCopyrightText: 2023 spdx contributors
//
// SPDX-License-Identifier: MIT
const SPDX_ID_PREPENDIX = "SPDXRef-";
const SHA1 = "SHA1";
function spdx(outputName) {
    const spdxDocument = spdxLib__namespace.createDocument(outputName);
    const collectedInputFiles = new Set();
    const collectedRelationships = new Set();
    return {
        name: "rollup-plugin-spdx",
        moduleParsed(moduleInfo) {
            const fileLocation = getRelativeLocation(moduleInfo.id);
            const dependencyLocations = moduleInfo.importedIds.map((id) => {
                return getRelativeLocation(id);
            });
            dependencyLocations.forEach((dependencyLocation) => {
                const relationship = {
                    element: spdxIdFromLocation(fileLocation),
                    relatedElement: spdxIdFromLocation(dependencyLocation),
                    relationshipType: spdxLib__namespace.RelationshipType.DEPENDS_ON,
                };
                if (!collectedRelationships.has(relationship)) {
                    collectedRelationships.add(relationship);
                }
            });
            if (collectedInputFiles.has(fileLocation)) {
                return;
            }
            collectedInputFiles.add(fileLocation);
            addFileFromModuleToDocument(fileLocation, spdxDocument)
                .then(() => { })
                .catch((error) => {
                throw error;
            });
        },
        writeBundle(options, bundle) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const outputDirectory = options.dir;
            collectDescribesRelationships(bundle, spdxDocument, collectedRelationships, outputDirectory);
            collectGeneratedFromRelationships(bundle, collectedInputFiles, collectedRelationships, outputDirectory);
            addRelationshipsToDocument(spdxDocument, collectedRelationships);
            addFilesFromBundleToDocument(bundle, spdxDocument, outputDirectory)
                .then(() => {
                if (options.file) {
                    throw new Error("options.file is not supported");
                }
                const spdxDocumentLocation = path__namespace.resolve(outputDirectory, `${outputName}.spdx.json`);
                spdxDocument.writeSync(spdxDocumentLocation, true);
            })
                .catch((error) => {
                throw error;
            });
        },
    };
}
function getRelativeLocation(absoluteLocation) {
    return path__namespace.relative(process.cwd(), absoluteLocation);
}
async function addFileFromModuleToDocument(id, spdxDocument) {
    sha1File.sha1File(path__namespace.resolve(id))
        .then((hash) => {
        spdxDocument.addFile(id, {
            checksumAlgorithm: SHA1,
            checksumValue: hash,
        }, {
            spdxId: spdxIdFromLocation(id),
        });
    })
        .catch((error) => {
        throw error;
    });
}
function collectDescribesRelationships(bundle, spdxDocument, collectedRelationships, outputDirectory) {
    for (const key in bundle) {
        const fileLocation = getRelativeLocation(`${outputDirectory}/${bundle[key].fileName}`);
        const relationship = {
            element: spdxDocument.creationInfo.spdxId,
            relatedElement: spdxIdFromLocation(fileLocation),
            relationshipType: spdxLib__namespace.RelationshipType.DESCRIBES,
        };
        if (!collectedRelationships.has(relationship)) {
            collectedRelationships.add(relationship);
        }
    }
}
function collectGeneratedFromRelationships(bundle, collectedInputFiles, collectedRelationships, outputDirectory) {
    for (const key in bundle) {
        const fileLocation = getRelativeLocation(`${outputDirectory}/${bundle[key].fileName}`);
        if (!bundle[key].facadeModuleId) {
            continue;
        }
        const referenceFileLocation = getRelativeLocation(bundle[key].facadeModuleId);
        if (!collectedInputFiles.has(referenceFileLocation)) {
            continue;
        }
        const relationship = {
            element: spdxIdFromLocation(fileLocation),
            relatedElement: spdxIdFromLocation(referenceFileLocation),
            relationshipType: spdxLib__namespace.RelationshipType.GENERATED_FROM,
        };
        if (!collectedRelationships.has(relationship)) {
            collectedRelationships.add(relationship);
        }
    }
}
function addRelationshipsToDocument(spdxDocument, collectedRelationships) {
    collectedRelationships.forEach((relationship) => {
        spdxDocument.addRelationship(relationship.element, relationship.relatedElement, relationship.relationshipType);
    });
}
async function addFilesFromBundleToDocument(bundle, spdxDocument, outputDirectory) {
    const promises = [];
    for (const key in bundle) {
        const fileLocation = getRelativeLocation(`${outputDirectory}/${bundle[key].fileName}`);
        promises.push(sha1File.sha1File(path__namespace.resolve(fileLocation)).then((hash) => {
            spdxDocument.addFile(fileLocation, {
                checksumAlgorithm: SHA1,
                checksumValue: hash,
            }, {
                spdxId: spdxIdFromLocation(fileLocation),
            });
        }));
    }
    await Promise.all(promises);
}
function spdxIdFromLocation(filePath) {
    return SPDX_ID_PREPENDIX + filePath.replace(/[^a-zA-Z0-9.-]+/g, "-");
}

module.exports = spdx;
//# sourceMappingURL=rollup-plugin-spdx.cjs.map
