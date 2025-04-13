import { ResourceID, Timestamp } from './params.model';
import { Photo } from './photo.model';

export interface IPoint {
  x: number;
  y: number;
}

export type PhotoSortType = 'star' | 'created_at';

export class Board {
  photos: Photo[][] = [];
  attributes: BoardAttributes;

  constructor(public board: IBoard) {
    this.attributes = JSON.parse(this.board.data) as BoardAttributes;
  }

  get id(): string {
    return this.board.id;
  }

  get name(): string {
    return this.attributes.name;
  }

  get categoryIds(): string[][] {
    return this.attributes.data.map((elem) => elem.categoryIds);
  }

  get categoryNames(): string[][] {
    return this.attributes.data.map((elem) => elem.categoryNames);
  }

  get categoryNamesFlattened(): string[] {
    return this.categoryNames
      .flatMap((innerArray) => innerArray)
      .filter((value, index, array) => array.indexOf(value) === index);
  }

  get createdAt(): Date {
    return this.board.created_at;
  }

  get updatedAt(): Date {
    return this.board.updated_at;
  }

  set updatedAt(date: Date) {
    this.board.updated_at = date;
  }

  get clusters(): Cluster[] {
    // console.log(this.attributes.data.length)
    return this.attributes.data;

    // replicate larger amount of data
    // return this.attributes.data.flatMap(cluster => Array(5).fill(cluster));
  }

  set clusters(clusters: Cluster[]) {
    this.attributes.data = clusters;
  }
}

export interface IBoard extends ResourceID, Timestamp {
  userId: string;
  data: string;
}

export interface BoardAttributes {
  name: string;
  data: Cluster[];
}

export interface Cluster {
  categoryIds: string[];
  categoryNames: string[];
  position: IPoint;
}

export interface GetBoardResponse {
  data: IBoard;
}

export interface ListBoardsResponse {
  data: IBoard[];
}

export interface CreateBoardRequest {
  data: string;
}

export interface CreateBoardResponse {
  data: IBoard;
}

export interface UpdateBoardRequest {
  data: string;
}

export interface UpdateBoardResponse {
  data: string;
}
