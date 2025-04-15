import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, mergeMap } from 'rxjs';
import {
  CreatePhotoRequest,
  CreatePhotoResponse,
  ListMyPhotoResponse,
  ListPhotosResponse,
  Photo,
  Photos,
  PhotosPerCategory,
  maxCompressedSize,
} from '../models/photo.model';
import {
  generateNewPhoto,
  generateNewPhotoFromListItem,
} from '../helpers/photo.helpers';
import { MinioService } from './minio.service';
import { PAGINATION } from '../models/params.model';
import { NgxImageCompressService } from 'ngx-image-compress';
import { base64ToFile } from '../helpers/base64ToFile';

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  private requestURL = 'photos/';

  constructor(private http: HttpClient, private minio: MinioService, private imageCompress: NgxImageCompressService) {}

  uploadPhoto(categoryIds: string[], photo: File): Observable<Photo> {
    const request: CreatePhotoRequest = {
      category_ids: categoryIds,
    };
    let uploadedPhoto: Photo;
  
    return this.http.post<CreatePhotoResponse>(this.requestURL, request).pipe(
      mergeMap(async (resp) => {
        uploadedPhoto = generateNewPhoto(resp);
        await this.minio.uploadPhoto(resp.data.meta.href, photo).toPromise();

        const compressedBase64 = await this.imageCompress.compressFile(
          URL.createObjectURL(photo),
          -1,
          undefined,
          50,
          maxCompressedSize,
          maxCompressedSize
        );
  
        const thumbnailFile = base64ToFile(compressedBase64, 'thumbnail_' + photo.name);
        uploadedPhoto.compressedUrl = compressedBase64
        uploadedPhoto.file = thumbnailFile
        await this.minio.uploadPhoto(resp.data.meta.href_thumbnail, thumbnailFile).toPromise();
  
        return uploadedPhoto;
      }),
      map((uploadedPhoto) => uploadedPhoto)
    );
  }

  listMyPhotos(next?: string): Observable<Photos> {
    return this.http
      .get<ListMyPhotoResponse>(
        next || this.requestURL + 'me/?limit=' + PAGINATION.LIMIT
      )
      .pipe(
        map((resp) => {
          const photos: Photos = {
            data: resp.data.map((item) => generateNewPhotoFromListItem(item)),
            next: resp.links?.next,
            numberPhotos: resp.meta.number_photos,
            numberStars: resp.meta.number_stars,
          };
          return photos;
        })
      );
  }

  listPhotos(
    categoryIds: string[],
    sortType: string,
    next?: string
  ): Observable<PhotosPerCategory> {
    let params = { params: new HttpParams() };
    if (next === undefined) {
      params = {
        params: new HttpParams()
          .set('category', categoryIds.join("."))
          .set('sort', sortType),
      };
    }
    // const params = { params: new HttpParams().set('category', categoryId) };
    return this.http
      .get<ListPhotosResponse>(
        next || this.requestURL + '?limit=' + PAGINATION.LIMIT,
        params
      )
      .pipe(
        map((resp) => {
          const photos: PhotosPerCategory = {
            data: resp.data.map((item) => generateNewPhotoFromListItem(item)),
            next: resp.links.next,
            categoryName: resp.meta.category_name,
          };
          return photos;
        })
      );
  }
}
