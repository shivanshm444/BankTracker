declare module 'react-native-get-sms-android' {
    interface SmsAndroid {
        list(
            filter: string,
            failCallback: (error: string) => void,
            successCallback: (count: number, smsList: string) => void
        ): void;
    }
    const smsAndroid: SmsAndroid;
    export default smsAndroid;
}
