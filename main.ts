import { MongoClient, ObjectId, OptionalId } from "mongodb";
import { BookModel } from "./types.ts";
import { getBookFromModel } from "./utilities.ts";

const MONGO_URL = Deno.env.get("MONGO_URL");
if (!MONGO_URL) {
	console.error("MONGO_URL not defined");
	Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.log("Connected to MongoDB (￣︶￣*))");

const db = client.db("biblioteca");
const booksCollection = db.collection<BookModel>("libros");

const handler = async (req: Request): Promise<Response> => {
	const method = req.method;
	const url = new URL(req.url);
	const path = url.pathname;

	if (method === "GET") {
		if (path.startsWith("/books")) {
			const libros: BookModel[] = await booksCollection.find().toArray();
			const libros_final = libros.map((lib: BookModel) =>
				getBookFromModel(lib)
			);

			return new Response(JSON.stringify(libros_final), { status: 200 });
		} else if (path.startsWith("/books/_id")) {
			const ID: string | null = String(path.split("/").at(3));
			if (!ID) {
				return new Response(
					JSON.stringify({ error: "Bad request, ID missing in path" }),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}

			const libro = await booksCollection.findOne({ _id: new ObjectId(ID) });

			if (!libro) {
				return new Response(JSON.stringify({ error: "Libro no encontrado" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(JSON.stringify(getBookFromModel(libro)), {
				status: 200,
			});
		}
	} else if (method === "POST") {
		if (path.startsWith("/books")) {
			const body = await req.json();
			if (!body.title || !body.author || !body.year) {
				return new Response(
					JSON.stringify("Bad request, some field missing in request body"),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}
			const newBook: OptionalId<BookModel> = {
				title: body.title,
				author: body.author,
				year: body.year,
			};

			const exist: BookModel | null = await booksCollection.findOne(newBook);
			if (exist) {
				return new Response("Book already exists in DB", { status: 403 });
			}
			const { insertedId } = await booksCollection.insertOne(newBook);
			return new Response(
				JSON.stringify({
					id: insertedId,
					title: newBook.title,
					author: newBook.author,
					year: newBook.year,
				}),
				{ status: 200 }
			);
		}
		//
	} else if (method === "PUT") {
		if (path.startsWith("/books/_id")) {
			const id: string | null = String(path.split("/").at(3));
			console.log(id);
			const body = await req.json();
			if (!body.title && !body.author && !body.year) {
				return new Response(
					JSON.stringify({
						error:
							"Debe enviar al menos un campo para actualizar (title, author, year)",
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					}
				);
			}
			const { modifiedCount } = await booksCollection.updateOne(
				{ _id: new ObjectId(id) },
				{ $set: { title: body.title, author: body.author, year: body.year } }
			);
			if (modifiedCount === 0) {
				return new Response(
					JSON.stringify("error : El ID del libro no existe."),
					{
						status: 404,
						headers: { "Content-Type": "application/json" },
					}
				);
			}
			return new Response(
				JSON.stringify({
					message: "Libro actualizado exitosamente",
					libro: {
						id: body.id,
						title: body.title,
						author: body.author,
						year: body.year,
					},
				})
			);
		}
	} else if (method === "DELETE") {
		if (path.startsWith("/books/_id")) {
			const ID: string | null = String(path.split("/").at(3));

			if (!ID) {
				return new Response(
					JSON.stringify({ error: "Bad request, ID missing in path" }),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}

			const { deletedCount } = await booksCollection.deleteOne({
				_id: new ObjectId(ID),
			});

			if (deletedCount === 0) {
				return new Response(JSON.stringify({ error: "Libro no encontrado" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return new Response(
				JSON.stringify({ error: "Libro eliminado exitosamente" }),
				{ status: 200 }
			);
		}
	}

	return new Response("Path not found", { status: 404 });
};

Deno.serve({ port: 4000 }, handler);
