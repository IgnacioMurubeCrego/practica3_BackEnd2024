import { Book, BookModel } from "./types.ts";

export const getBookFromModel = (bookModel: BookModel): Book => {
	return {
		id: bookModel._id!.toString(),
		title: bookModel.title,
		author: bookModel.author,
		year: bookModel.year,
	};
};
