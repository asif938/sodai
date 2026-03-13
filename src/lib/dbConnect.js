import { MongoClient, ServerApiVersion } from 'mongodb';

export const collectionNamesObj = {
    bazarCollection: "bazar_list",
};

let client;
let clientPromise;

export default function dbConnect(collectionName) {
    const uri = process.env.MONGO_URI;
    if (!client) {
        client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
        });
        clientPromise = client.connect();
    }
    return clientPromise.then(() => client.db('sodai').collection(collectionName));
}
