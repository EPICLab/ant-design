import * as React from 'react';
import RightOutlined from '@ant-design/icons/RightOutlined';
import RcCollapse from 'rc-collapse';
import classNames from 'classnames';

import CollapsePanel from './CollapsePanel';
import animation from './openAnimation';
import { cloneElement } from '../_util/reactNode';
import { ConfigContext } from '../config-provider';

export type ExpandIconPosition = 'right' | 'left' | undefined;

export interface CollapseProps {
  defaultActiveKey?: Array<string | number> | string | number;
  activeKey?: Array<string | number> | string | number;
  accordion?: boolean;
  destroyInactivePanel?: boolean;
  style?: React.CSSProperties;
  className?: string;
  bordered?: boolean;
  prefixCls?: string;
  expandIconPosition?: ExpandIconPosition;
  ghost?: boolean;
  onChange?: (key: string | string[]) => void;
  expandIcon?: (panelProps: PanelProps) => React.ReactNode;
}

interface PanelProps {
  header?: React.ReactNode;
  className?: string;
  isActive?: boolean;
  style?: React.CSSProperties;
  showArrow?: boolean;
  forceRender?: boolean;
  disabled?: boolean;
  extra?: React.ReactNode;
}

interface CollapseInterface extends React.FC<CollapseProps> {
  Panel: typeof CollapsePanel;
}

const Collapse: CollapseInterface = props => {
  const { getPrefixCls, direction } = React.useContext(ConfigContext);
  const { prefixCls: customizePrefixCls, className = '', bordered = true, ghost } = props;
  const prefixCls = getPrefixCls('collapse', customizePrefixCls);
  const getIconPosition = () => {
    const { expandIconPosition } = props;

    if (expandIconPosition !== undefined) {
      return expandIconPosition;
    }

    if (direction === 'ltr') {
      return 'left';
    }

    if (direction === 'rtl') {
      return 'right';
    }
  };

  const renderExpandIcon = (panelProps: PanelProps = {}) => {
    const { expandIcon } = props;
    let icon: {} | null | undefined;

    if (expandIcon) {
      icon = expandIcon(panelProps) as React.ReactNode;
    } else {
      icon = (<RightOutlined rotate={!panelProps.isActive ? undefined : 90} />) as React.ReactNode;
    }

    const cloneElem = cloneElement(icon, () => ({
      className: classNames((icon as any).props.className, `${prefixCls}-arrow`),
    }));

    return cloneElem;
  };

  const iconPosition = getIconPosition();

  const collapseClassName = classNames(
    {
      [`${prefixCls}-borderless`]: !bordered,
      [`${prefixCls}-icon-position-${iconPosition}`]: true,
      [`${prefixCls}-rtl`]: direction === 'rtl',
      [`${prefixCls}-ghost`]: !!ghost,
    },
    className,
  );
  const openAnimation = { ...animation, appear() {} };

  return (
    <RcCollapse
      className={collapseClassName}
      expandIcon={renderExpandIcon}
      bordered={bordered}
      prefixCls={prefixCls}
      openAnimation={openAnimation}
      {...props}
    />
  );
};

Collapse.Panel = CollapsePanel;

export default Collapse;
