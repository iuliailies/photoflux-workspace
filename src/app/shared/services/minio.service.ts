import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap } from 'rxjs';
import { NgxImageCompressService } from 'ngx-image-compress';
import { maxNormalSize } from '../models/photo.model';

// service used for interaction with the minio storage, follows the presigned url approach
// https://min.io/docs/minio/linux/integrations/presigned-put-upload-via-browser.html

@Injectable({
  providedIn: 'root',
})
export class MinioService {
  private http!: HttpClient;

  constructor(
    private handler: HttpBackend,
    private imageCompress: NgxImageCompressService
  ) {
    // bypass http interceptor
    this.http = new HttpClient(handler);
  }

  uploadPhoto(url: string, photo: File): Observable<any> {
    let compressedPhoto!: File;
    return from(
      this.imageCompress.compressFile(
        URL.createObjectURL(photo),
        -1,
        undefined,
        80,
        maxNormalSize,
        maxNormalSize
      )
    )
      .pipe(
        switchMap((compressedString) => {
          compressedPhoto = this.dataURItoBlob(compressedString);

          return this.http.put(url, compressedPhoto);
        })
      )
      .pipe(map(() => compressedPhoto));
  }

  getPhoto(url: string): Observable<any> {
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError(() => {
        return of(false);
      })
    );
  }

  dataURItoBlob(dataURI: string): File {
    // transforms the string returned by the image compresser package into a File object
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    return new File([blob], 'compressed_photo.jpg');
  }
}
