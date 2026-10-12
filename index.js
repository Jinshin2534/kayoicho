// 位置タスクは画面が出ない裏起動でも必ず登録されていなければならないので、ルーターより先に読み込む
import './src/services/tracker';
import 'expo-router/entry';
