"use server";
import dbConnect, { collectionNamesObj } from "@/lib/dbConnect";
import { broadcast } from "@/lib/sse";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

const col = () => dbConnect(collectionNamesObj.bazarCollection);

export const getItems = async () => {
    try {
        const data = await (await col()).find({}).sort({ createdAt: -1 }).toArray();
        return data.map(item => ({ ...item, _id: item._id.toString() }));
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const addItem = async (payload) => {
    try {
        const result = await (await col()).insertOne({ ...payload, createdAt: new Date() });
        revalidatePath("/");
        broadcast({ type: "REFRESH" });
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false };
    }
};

export const deleteItem = async (id) => {
    try {
        await (await col()).deleteOne({ _id: new ObjectId(id) });
        revalidatePath("/");
        broadcast({ type: "REFRESH" });
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false };
    }
};

export const toggleItem = async (id, currentStatus) => {
    try {
        const newStatus = currentStatus === "নেওয়া হয়েছে" ? "নিতে হবে" : "নেওয়া হয়েছে";
        await (await col()).updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: newStatus } }
        );
        revalidatePath("/");
        broadcast({ type: "REFRESH" });
        return { success: true, newStatus };
    } catch (error) {
        console.error(error);
        return { success: false };
    }
};

export const updateItem = async (id, data) => {
    try {
        await (await col()).updateOne({ _id: new ObjectId(id) }, { $set: data });
        revalidatePath("/");
        broadcast({ type: "REFRESH" });
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false };
    }
};

export const clearCollected = async () => {
    try {
        await (await col()).deleteMany({ status: "নেওয়া হয়েছে" });
        revalidatePath("/");
        broadcast({ type: "REFRESH" });
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false };
    }
};
