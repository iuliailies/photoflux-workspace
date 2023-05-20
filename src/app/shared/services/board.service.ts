import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Board,
  BoardAttributes,
  Cluster,
  CreateBoardRequest,
  CreateBoardResponse,
  GetBoardResponse,
  ListBoardsResponse,
} from '../models/board.model';

@Injectable({
  providedIn: 'root',
})
export class BoardService {
  private requestURL = 'boards/';

  constructor(private http: HttpClient) {}

  listBoards(): Observable<Board[]> {
    return this.http
      .get<ListBoardsResponse>(this.requestURL)
      .pipe(map((resp) => resp.data.map((board) => new Board(board))));
  }

  getBoard(id: string): Observable<Board> {
    return this.http
      .get<GetBoardResponse>(this.requestURL + id)
      .pipe(map((resp) => new Board(resp.data)));
  }

  createBoard(name: string, clusters: Cluster[]): Observable<Board> {
    const req: BoardAttributes = {
      name: name,
      data: clusters,
    };
    return this.http
      .post<CreateBoardResponse>(this.requestURL, { data: JSON.stringify(req) })
      .pipe(map((resp) => new Board(resp.data)));
  }
}