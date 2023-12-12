import * as spdxLib from '@spdx/tools';
import * as path from 'path';
import { sha1File } from 'sha1-file';

// SPDX-FileCopyrightText: 2023 spdx contributors
//
// SPDX-License-Identifier: MIT
const SPDX_ID_PREPENDIX = "SPDXRef-";
const SHA1 = "SHA1";
function spdx(outputName) {
    const spdxDocument = spdxLib.createDocument(outputName);
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
                    relationshipType: spdxLib.RelationshipType.DEPENDS_ON,
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
                const spdxDocumentLocation = path.resolve(outputDirectory, `${outputName}.spdx.json`);
                spdxDocument.writeSync(spdxDocumentLocation, true);
            })
                .catch((error) => {
                throw error;
            });
        },
    };
}
function getRelativeLocation(absoluteLocation) {
    return path.relative(process.cwd(), absoluteLocation);
}
async function addFileFromModuleToDocument(id, spdxDocument) {
    sha1File(path.resolve(id))
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
            relationshipType: spdxLib.RelationshipType.DESCRIBES,
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
            relationshipType: spdxLib.RelationshipType.GENERATED_FROM,
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
        promises.push(sha1File(path.resolve(fileLocation)).then((hash) => {
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

export { spdx as default };
//# sourceMappingURL=rollup-plugin-spdx.mjs.map
