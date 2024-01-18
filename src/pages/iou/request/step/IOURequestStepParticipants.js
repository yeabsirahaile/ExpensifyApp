import {useNavigationState} from '@react-navigation/native';
import lodashGet from 'lodash/get';
import React, {useCallback, useEffect, useRef} from 'react';
import transactionPropTypes from '@components/transactionPropTypes';
import useLocalize from '@hooks/useLocalize';
import compose from '@libs/compose';
import * as IOUUtils from '@libs/IOUUtils';
import Navigation from '@libs/Navigation/Navigation';
import * as TransactionUtils from '@libs/TransactionUtils';
import MoneyRequestParticipantsSelector from '@pages/iou/request/MoneyTemporaryForRefactorRequestParticipantsSelector';
import * as IOU from '@userActions/IOU';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import IOURequestStepRoutePropTypes from './IOURequestStepRoutePropTypes';
import StepScreenWrapper from './StepScreenWrapper';
import withFullTransactionOrNotFound from './withFullTransactionOrNotFound';
import withWritableReportOrNotFound from './withWritableReportOrNotFound';

const propTypes = {
    /** Navigation route context info provided by react navigation */
    route: IOURequestStepRoutePropTypes.isRequired,

    /* Onyx Props */
    /** The transaction object being modified in Onyx */
    transaction: transactionPropTypes,
};

const defaultProps = {
    transaction: {},
};

function IOURequestStepParticipants({
    route: {
        params: {iouType, reportID, transactionID},
    },
    transaction,
    transaction: {participants = []},
}) {
    const {translate} = useLocalize();
    const routes = useNavigationState((state) => state.routes);
    const selectedReportID = useRef(reportID);
    const numberOfParticipants = useRef(participants.length);
    const iouRequestType = TransactionUtils.getRequestType(transaction);
    const isSplitRequest = iouType === CONST.IOU.TYPE.SPLIT;
    const headerTitle = isSplitRequest ? translate('iou.split') : translate(TransactionUtils.getHeaderTitleTranslationKey(transaction));
    const receiptFilename = lodashGet(transaction, 'filename');
    const receiptPath = lodashGet(transaction, 'receipt.source');
    const newIouType = useRef();

    // When the component mounts, if there is a receipt, see if the image can be read from the disk. If not, redirect the user to the starting step of the flow.
    // This is because until the request is saved, the receipt file is only stored in the browsers memory as a blob:// and if the browser is refreshed, then
    // the image ceases to exist. The best way for the user to recover from this is to start over from the start of the request process.
    useEffect(() => {
        IOUUtils.navigateToStartStepIfScanFileCannotBeRead(receiptFilename, receiptPath, () => {}, iouRequestType, iouType, transactionID, reportID);
    }, [receiptPath, receiptFilename, iouRequestType, iouType, transactionID, reportID]);

    const updateRouteParams = useCallback(() => {
        IOU.updateMoneyRequestTypeParams(routes, newIouType.current);
    }, [routes]);

    useEffect(() => {
        if (newIouType.current) {
            // Participants can be added as normal or split participants. We want to wait for the participants' data to be updated before
            // updating the money request type route params reducing the overhead of the thread and preventing possible jitters in UI.
            updateRouteParams();
            newIouType.current = null;
        }
    }, [participants, routes, updateRouteParams]);

    const addParticipant = useCallback(
        (val, isSplit) => {
            // It's only possible to switch between REQUEST and SPLIT.
            // We want to update the IOU type only if it's not updated yet to prevent unnecessary updates.
            if (isSplit && iouType !== CONST.IOU.TYPE.SPLIT) {
                newIouType.current = CONST.IOU.TYPE.SPLIT;
            } else if (!isSplit && iouType === CONST.IOU.TYPE.SPLIT) {
                // Non-split can be either REQUEST or SEND. Instead of checking whether
                // the current IOU type is not a REQUEST (true for SEND), we check whether the current IOU type is a SPLIT.
                newIouType.current = CONST.IOU.TYPE.REQUEST;
            }

            IOU.setMoneyRequestParticipants_temporaryForRefactor(transactionID, val);
            numberOfParticipants.current = val.length;

            // When multiple participants are selected, the reportID is generated at the end of the confirmation step.
            // So we are resetting selectedReportID ref to the reportID coming from params.
            if (val.length !== 1) {
                selectedReportID.current = reportID;
                return;
            }

            // When a participant is selected, the reportID needs to be saved because that's the reportID that will be used in the confirmation step.
            selectedReportID.current = lodashGet(val, '[0].reportID', reportID);
        },
        [reportID, transactionID, iouType, routes],
    );

    const goToNextStep = useCallback(
        (isSplit) => {
            const nextStepIOUType = !isSplit && iouType !== CONST.IOU.TYPE.REQUEST ? CONST.IOU.TYPE.REQUEST : iouType;
            IOU.resetMoneyRequestTag_temporaryForRefactor(transactionID);
            IOU.resetMoneyRequestCategory_temporaryForRefactor(transactionID);
            Navigation.navigate(ROUTES.MONEY_REQUEST_STEP_CONFIRMATION.getRoute(nextStepIOUType, transactionID, selectedReportID.current || reportID));
        },
        [iouType, transactionID, reportID],
    );

    const navigateBack = useCallback(() => {
        IOUUtils.navigateToStartMoneyRequestStep(iouRequestType, iouType, transactionID, reportID);
    }, [iouRequestType, iouType, transactionID, reportID]);

    return (
        <StepScreenWrapper
            headerTitle={headerTitle}
            onBackButtonPress={navigateBack}
            shouldShowWrapper
            testID={IOURequestStepParticipants.displayName}
            includeSafeAreaPaddingBottom
        >
            <MoneyRequestParticipantsSelector
                participants={isSplitRequest ? participants : []}
                onParticipantsAdded={addParticipant}
                onFinish={goToNextStep}
                iouType={iouType}
                iouRequestType={iouRequestType}
            />
        </StepScreenWrapper>
    );
}

IOURequestStepParticipants.displayName = 'IOURequestStepParticipants';
IOURequestStepParticipants.propTypes = propTypes;
IOURequestStepParticipants.defaultProps = defaultProps;

export default compose(withWritableReportOrNotFound, withFullTransactionOrNotFound)(IOURequestStepParticipants);
