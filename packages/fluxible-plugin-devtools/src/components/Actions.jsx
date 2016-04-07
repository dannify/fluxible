import React from 'react';
import ActionTree from './ActionTree';

export default class Actions extends React.Component {
    static contextTypes = {
        devtools: React.PropTypes.object
    }

    render() {
        var actions = this.context.devtools.getActionHistory()
            .map(action => <ActionTree action={action} key={action.rootId} />);
        return <div>{actions}</div>;
    }
};
