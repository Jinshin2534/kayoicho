/** 同じ場所にいるとみなす半径 */
export const STAY_RADIUS_M = 50;
/** これ以上とどまったら「滞在」 */
export const STAY_MIN_MS = 5 * 60_000;
/** これより精度の悪い点は捨てる(GPSの飛び対策) */
export const MAX_ACCURACY_M = 100;
/** 既存の建物の中心からこの距離以内なら同じ建物 */
export const SAME_PLACE_RADIUS_M = 40;
/** 同じ建物への滞在がこの間隔以内で続いたら1回の訪問にまとめる */
export const MERGE_GAP_MS = 10 * 60_000;
/** 処理済みの生の座標を残す期間 */
export const POINT_RETENTION_MS = 30 * 24 * 60 * 60_000;
/** 建物の名前を探す半径 */
export const NAME_SEARCH_RADIUS_M = 50;
