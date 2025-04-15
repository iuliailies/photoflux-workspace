import {
  CreatePhotoResponse,
  Photo,
  PhotoListItemData,
} from '../models/photo.model';

export const generateNewPhoto = (resp: CreatePhotoResponse): Photo => {
  const p = new Photo(
    resp.data.id,
    resp.data.attributes,
    resp.data.meta.number_stars,
    false, // photo is definetely not starred right when created
    resp.data.meta.href,
    resp.data.meta.href_thumbnail,
    resp.data.relationships.categories.data.map((data) => data.id)
  );

  return p;
};

export const generateNewPhotoFromListItem = (
  resp: PhotoListItemData
): Photo => {
  const p = new Photo(
    resp.id,
    resp.attributes,
    resp.meta.number_stars,
    resp.meta.starred_by_user,
    resp.meta.href,
    resp.meta.href_thumbnail,
    []
  );

  return p;
};
