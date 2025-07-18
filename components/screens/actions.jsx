import { Actionsheet, ActionsheetContent, ActionsheetItem, ActionsheetItemText, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper, ActionsheetBackdrop } from "@/components/ui/actionsheet";
import { Button, ButtonText } from "@/components/ui/button";
import React from "react";
	
export default function Actions(){
        const [showActionsheet, setShowActionsheet] = React.useState(false);
        const handleClose = () => setShowActionsheet(false);
          return (
            <>
              <Button onPress={() => setShowActionsheet(true)}>
                <ButtonText>Open Actionsheet</ButtonText>
              </Button>
              <Actionsheet isOpen={showActionsheet} onClose={handleClose}>
                <ActionsheetBackdrop />
                <ActionsheetContent>
                  <ActionsheetDragIndicatorWrapper>
                    <ActionsheetDragIndicator />
                  </ActionsheetDragIndicatorWrapper>
                  <ActionsheetItem onPress={handleClose}>
                    <ActionsheetItemText>Edit Message</ActionsheetItemText>
                  </ActionsheetItem>
                  <ActionsheetItem onPress={handleClose}>
                    <ActionsheetItemText>Mark Unread</ActionsheetItemText>
                  </ActionsheetItem>
                  <ActionsheetItem onPress={handleClose}>
                    <ActionsheetItemText>Remind Me</ActionsheetItemText>
                  </ActionsheetItem>
                  <ActionsheetItem onPress={handleClose}>
                    <ActionsheetItemText>Add to Saved Items</ActionsheetItemText>
                  </ActionsheetItem>
                  <ActionsheetItem isDisabled onPress={handleClose}>
                    <ActionsheetItemText>Delete</ActionsheetItemText>
                  </ActionsheetItem>
                </ActionsheetContent>
              </Actionsheet>
            </>
          );
        }