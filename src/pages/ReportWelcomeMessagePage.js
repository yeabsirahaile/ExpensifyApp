import {useFocusEffect} from '@react-navigation/native';
import ExpensiMark from 'expensify-common/lib/ExpensiMark';
import PropTypes from 'prop-types';
import React, {useCallback, useRef, useState} from 'react';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import TextInput from '@components/TextInput';
import withLocalize, {withLocalizePropTypes} from '@components/withLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import compose from '@libs/compose';
import * as ErrorUtils from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import * as ReportUtils from '@libs/ReportUtils';
import updateMultilineInputRange from '@libs/updateMultilineInputRange';
import * as Report from '@userActions/Report';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import withReportOrNotFound from './home/report/withReportOrNotFound';
import reportPropTypes from './reportPropTypes';
import {policyDefaultProps, policyPropTypes} from './workspace/withPolicy';

const propTypes = {
    ...withLocalizePropTypes,
    ...policyPropTypes,

    /** The report currently being looked at */
    report: reportPropTypes.isRequired,

    /** Route params */
    route: PropTypes.shape({
        params: PropTypes.shape({
            /** Report ID passed via route r/:reportID/welcomeMessage */
            reportID: PropTypes.string,
        }),
    }).isRequired,
};

const defaultProps = {
    ...policyDefaultProps,
};

function ReportWelcomeMessagePage(props) {
    const styles = useThemeStyles();
    const parser = new ExpensiMark();
    const [welcomeMessage, setWelcomeMessage] = useState(() => parser.htmlToMarkdown(props.report.welcomeMessage));
    const welcomeMessageInputRef = useRef(null);
    const focusTimeoutRef = useRef(null);

    const handleWelcomeMessageChange = useCallback((value) => {
        setWelcomeMessage(value);
    }, []);

    /**
     * @param {Object} values
     * @param {String} values.title
     * @returns {Object} - An object containing the errors for each inputID
     */
    const validate = useCallback((values) => {
        const errors = {};

        if (values.welcomeMessage.length > CONST.SUPPORTING_CHARACTER_LIMIT) {
            ErrorUtils.addErrorMessage(errors, 'welcomeMessage', [
                'common.error.characterLimitExceedCounter',
                {length: values.welcomeMessage.length, limit: CONST.SUPPORTING_CHARACTER_LIMIT},
            ]);
        }

        return errors;
    }, []);

    const submitForm = useCallback(() => {
        Report.updateWelcomeMessage(props.report.reportID, props.report.welcomeMessage, welcomeMessage.trim());
    }, [props.report.reportID, props.report.welcomeMessage, welcomeMessage]);

    useFocusEffect(
        useCallback(() => {
            focusTimeoutRef.current = setTimeout(() => {
                if (welcomeMessageInputRef.current) {
                    welcomeMessageInputRef.current.focus();
                }
                return () => {
                    if (!focusTimeoutRef.current) {
                        return;
                    }
                    clearTimeout(focusTimeoutRef.current);
                };
            }, CONST.ANIMATED_TRANSITION);
        }, []),
    );

    return (
        <ScreenWrapper
            shouldEnableMaxHeight
            includeSafeAreaPaddingBottom={false}
            testID={ReportWelcomeMessagePage.displayName}
        >
            <FullPageNotFoundView shouldShow={ReportUtils.shouldDisableWelcomeMessage(props.report, props.policy)}>
                <HeaderWithBackButton
                    title={props.translate('welcomeMessagePage.welcomeMessage')}
                    onBackButtonPress={() => Navigation.goBack(ROUTES.REPORT_SETTINGS.getRoute(props.report.reportID))}
                />
                <FormProvider
                    style={[styles.flexGrow1, styles.ph5]}
                    formID={ONYXKEYS.FORMS.WELCOME_MESSAGE_FORM}
                    onSubmit={submitForm}
                    validate={validate}
                    submitButtonText={props.translate('common.save')}
                    enabledWhenOffline
                >
                    <Text style={[styles.mb5]}>{props.translate('welcomeMessagePage.explainerText')}</Text>
                    <View style={[styles.mb6]}>
                        <InputWrapper
                            InputComponent={TextInput}
                            inputID="welcomeMessage"
                            label={props.translate('welcomeMessagePage.welcomeMessage')}
                            accessibilityLabel={props.translate('welcomeMessagePage.welcomeMessage')}
                            role={CONST.ROLE.PRESENTATION}
                            autoGrowHeight
                            maxLength={CONST.MAX_COMMENT_LENGTH}
                            ref={(el) => {
                                if (!el) {
                                    return;
                                }
                                welcomeMessageInputRef.current = el;
                                updateMultilineInputRange(welcomeMessageInputRef.current);
                            }}
                            value={welcomeMessage}
                            onChangeText={handleWelcomeMessageChange}
                            autoCapitalize="none"
                            containerStyles={[styles.autoGrowHeightMultilineInput]}
                        />
                    </View>
                </FormProvider>
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

ReportWelcomeMessagePage.displayName = 'ReportWelcomeMessagePage';
ReportWelcomeMessagePage.propTypes = propTypes;
ReportWelcomeMessagePage.defaultProps = defaultProps;

export default compose(
    withLocalize,
    withReportOrNotFound(),
    withOnyx({
        policy: {
            key: ({report}) => `${ONYXKEYS.COLLECTION.POLICY}${report.policyID}`,
        },
    }),
)(ReportWelcomeMessagePage);
