const fs = require("fs");
const path = require("path");
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
if (!accountName) throw Error("Azure Storage accountName not found");

// Create a client that can authenticate passwordless
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  new DefaultAzureCredential() //passwordless
);

async function main() {
  // Create the container and return a container client object
  const containerName = "wtblob" + uuidv4();
  const { containerClient } = await blobServiceClient.createContainer(
    containerName
  );

  console.log(`A container named '${containerName}' has been created.\n`);
  console.log("Press 'Enter' to continue.");
  await waitForEnter();

  // Create a local file in the ./data/ directory for uploading and downloading
  const localPath = "./data/";
  const fileName = "wtfile" + uuidv4() + ".txt";
  const localFilePath = path.join(localPath, fileName);

  // Write text to the file
  fs.writeFileSync(localFilePath, "Hello, World!");

  // Get a reference to the blob
  const blobClient = containerClient.getBlockBlobClient(fileName);

  console.log(`Uploading to Blob storage as blob:\n\t ${blobClient.url}\n`);

  // Upload the file's data
  await blobClient.uploadFile(localFilePath);

  console.log("\nThe file was uploaded. Listing the blobs next.");
  console.log("Press 'Enter' to continue.");
  await waitForEnter();

  // List blobs in the container
  console.log("Listing blobs...");
  for await (const blob of containerClient.listBlobsFlat()) {
    console.log("\t" + blob.name);
  }

  console.log("\nNext the blob will be downloaded with an altered file name.");
  console.log("Press 'Enter' to continue.");
  await waitForEnter();

  // Download the blob to a local file
  const downloadFilePath = localFilePath.replace(".txt", "DOWNLOADED.txt");

  console.log(`\nDownloading blob to\n\t${downloadFilePath}\n`);

  // Download the blob's contents and save it to a file
  const downloadBlockBlobResponse = await blobClient.downloadToFile(
    downloadFilePath
  );

  console.log(
    "\nLocate the local file in the data directory created earlier to verify it was downloaded."
  );
  console.log("The next step is to delete the container and local files.");
  console.log("Press 'Enter' to continue.");
  await waitForEnter();

  // Delete the container and clean up local files created
  console.log("\n\nDeleting blob container...");
  await containerClient.delete();

  console.log("Deleting the local source and downloaded files...");
  fs.unlinkSync(localFilePath);
  fs.unlinkSync(downloadFilePath);

  console.log("Finished cleaning up.");
}

// Helper function to wait for 'Enter'
function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.on("data", function (data) {
      if (data.toString() === "\n") {
        process.stdin.pause();
        resolve();
      }
    });
  });
}

main()
  .then(() => console.log(`done`))
  .catch((ex) => console.log(`error: ${ex.message}`));
